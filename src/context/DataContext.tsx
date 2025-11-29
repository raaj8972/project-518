import React, { useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, SUPABASE_HOST } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { encryptData, decryptData } from '../utils/encryption';

// Define types for your data based on Supabase schema
export type Event = Database['public']['Tables']['events']['Row'];
export type EventCoordinator = Database['public']['Tables']['event_coordinators']['Row'];
export type GalleryImage = Database['public']['Tables']['gallery_images']['Row'];
export type Sponsor = Database['public']['Tables']['sponsors']['Row'];
export type ScheduleDay = Database['public']['Tables']['schedule_days']['Row'] & { events: ScheduleEvent[] };
export type ScheduleEvent = Database['public']['Tables']['schedule_events']['Row'];
export type Registration = Database['public']['Tables']['registrations']['Row'];
export type SponsorshipSettings = Database['public']['Tables']['sponsorship_settings']['Row'] & { contactSections: ContactSection[] };
export type ContactSection = Database['public']['Tables']['contact_sections']['Row'];
export type EventCategory = Database['public']['Tables']['event_categories']['Row'];
export type FacultyHead = Database['public']['Tables']['faculty_heads']['Row'];
export type CoreCommittee = Database['public']['Tables']['core_committees']['Row'];
export type AdminPermission = Database['public']['Tables']['admin_permissions']['Row'];
export type CoreTeamMember = Database['public']['Tables']['core_team_members']['Row'];
export type SportsCommittee = Database['public']['Tables']['sports_committees']['Row'];
export type SportsTeamMember = Database['public']['Tables']['sports_team_members']['Row'];
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
export type SiteSettings = Database['public']['Tables']['site_settings']['Row'];
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

// Safe defaults when gallery_settings table isn't present yet
const DEFAULT_GALLERY_SETTINGS: GallerySettings = {
  id: 1,
  scroll_per_item: 650,
  distance: 1400,
  background_blur_px: 100,
  card_blur_max: 8,
  reveal_enabled: true,
  reveal_duration_ms: 800,
  reveal_orientation: 'horizontal',
  updated_at: null,
};

interface DataContextType {
  events: Event[];
  eventCoordinators: EventCoordinator[];
  galleryImages: GalleryImage[];
  sponsors: Sponsor[];  
  schedule: ScheduleDay[];
  registrations: Registration[];
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
  roadmapMilestones: RoadmapMilestone[];
  heroMedia: Partial<Record<PageKey, HeroMedia | null>>;
  loading: boolean;
  // Connection health
  connectionStatus: 'ok' | 'degraded' | 'offline';
  lastError: string | null;
  latencyMs?: number | null;
  supabaseHost?: string;
  // Realtime channels status map
  realtimeStatus?: Record<string, string>;
  // Whether UI should display an offline/degraded banner right now (suppresses during warmup and single blips)
  showConnectionBanner?: boolean;
  refreshAll: (silent?: boolean) => Promise<void>;
  resubscribeRealtime: () => void;
  addEvent: (event: Partial<Event>) => Promise<void>;
  addEventWithCoordinators: (
    event: Partial<Event>,
    coordinators: Array<{ name: string; phone?: string | null }>
  ) => Promise<void>;
  // Winners
  eventWinners?: Array<any>;
  addEventWinner?: (winner: { event_id?: number | null; category?: string | null; position?: number; name: string; year?: string | null; photo_url?: string | null; registration_id?: string | null }) => Promise<void>;
  updateEventWinner?: (id: number, patch: Partial<any>) => Promise<void>;
  deleteEventWinner?: (id: number) => Promise<void>;
  // Notifications
  notifications: Array<{ id: number; title: string | null; message: string; type: string; link_url: string | null; visible: boolean; starts_at: string; ends_at: string | null; priority: number; admin_only?: boolean; auto_dismiss_seconds?: number | null; text_color?: string | null; glow_color?: string | null; created_at: string }>;
  addNotification?: (n: { title?: string | null; message: string; type?: string; link_url?: string | null; visible?: boolean; starts_at?: string | null; ends_at?: string | null; priority?: number; auto_dismiss_seconds?: number | null; text_color?: string | null; glow_color?: string | null }) => Promise<void>;
  updateNotification?: (id: number, patch: Partial<any>) => Promise<void>;
  deleteNotification?: (id: number) => Promise<void>;
  // Notifications UX controls
  suppressPublicNotifications: boolean;
  setSuppressPublicNotifications?: (flag: boolean) => void;
  updateEvent: (id: number, event: Partial<Event>) => Promise<void>;
  // Manual ordering for events (display_order ascending)
  reorderEvents: (orderedIds: number[]) => Promise<boolean>;
  // Manual ordering for event categories (order_position ascending)
  reorderEventCategories: (orderedIds: number[]) => Promise<boolean>;
  deleteEvent: (id: number) => Promise<void>;
  addEventCoordinator: (coordinator: Omit<EventCoordinator, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateEventCoordinator: (id: number, patch: Partial<EventCoordinator>) => Promise<void>;
  deleteEventCoordinator: (id: number) => Promise<void>;
  toggleEventFeatured: (id: number) => Promise<void>;
  toggleEventVisibility: (id: number) => Promise<void>;
  toggleEventRegistration: (id: number) => Promise<void>;
  // Included in runtime
  addGalleryImage: (image: Partial<GalleryImage>) => Promise<void>;
  updateGalleryImage: (id: number, image: Partial<GalleryImage>) => Promise<void>;
  deleteGalleryImage: (id: number) => Promise<void>;
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
  updateRegistrationStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  bulkApproveRegistrations?: (ids: string[]) => Promise<void>;
  bulkRejectRegistrations?: (ids: string[]) => Promise<void>;
  bulkDeleteRegistrations?: (ids: string[]) => Promise<void>;
  deleteRegistration: (id: string) => Promise<void>;
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
  // Sports Committees
  addSportsCommittee: (committee: Partial<SportsCommittee>) => Promise<void>;
  updateSportsCommittee: (id: number, committee: Partial<SportsCommittee>) => Promise<void>;
  deleteSportsCommittee: (id: number) => Promise<void>;
  toggleSportsCommitteeEnabled: (id: number) => Promise<void>;
  // Sports Team Members
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
  // Chief Guests
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
  // Prefetch helpers to warm important pages' data without toggling global loading
  prefetchEvents?: () => Promise<void>;
  prefetchGalleryImages?: () => Promise<void>;
  addRoadmapMilestone: (m: Partial<RoadmapMilestone>) => Promise<void>;
  updateRoadmapMilestone: (id: number, m: Partial<RoadmapMilestone>) => Promise<void>;
  deleteRoadmapMilestone: (id: number) => Promise<void>;
  toggleRoadmapMilestoneEnabled: (id: number) => Promise<void>;
  fetchHeroMedia: (pageKey: PageKey) => Promise<HeroMedia | null>;
  updateHeroMedia: (pageKey: PageKey, patch: Partial<HeroMedia>) => Promise<void>;
  // Best-effort detection of registration photo feature readiness
  schemaCapabilities?: {
    events_registration_photo_required: boolean;
    events_registration_photo_label: boolean;
    registrations_photo_url: boolean;
    storage_registration_photos_bucket: boolean;
  };
  // Storage management (registration photos)
  getRegistrationPhotos: (page?: number, pageSize?: number) => Promise<{ items: Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>; total: number }>;
  computeRegistrationPhotosUsage: () => Promise<{ totalBytes: number; count: number }>;
  deleteRegistrationPhoto: (name: string) => Promise<{ ok: boolean; clearedRefs: number }>;
  // Generic storage management for any bucket
  getBucketObjects: (bucket: string, page?: number, pageSize?: number) => Promise<{ items: Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>; total: number }>;
  computeBucketUsage: (bucket: string) => Promise<{ totalBytes: number; count: number }>;
  deleteBucketObject: (bucket: string, name: string) => Promise<{ ok: boolean; clearedRefs: number }>;
  // Buckets + aggregate usage + quota
  listStorageBuckets: () => Promise<string[]>;
  computeAllBucketsUsage: () => Promise<{ totalBytes: number; count: number }>;
  storageQuotaBytes: number | null;
  // Diagnostics
  pingNow?: () => Promise<void>;
  // Admin users management
  adminUsers?: Array<{ user_id: string; email: string; created_at: string; role?: 'owner' | 'admin'; is_primary?: boolean }>;
  refreshAdminUsers?: () => Promise<void>;
  addAdminUser?: (userId: string, email: string) => Promise<void>;
  removeAdminUser?: (userId: string) => Promise<void>;
  addAdminByEmail?: (email: string) => Promise<void>;
  // Owner-only: create a new auth user (email+password) and add as admin via serverless function
  createAdminAccount?: (email: string, password: string) => Promise<{ user_id: string; email: string } | null>;
  updateAdminEmail?: (userId: string, newEmail: string) => Promise<void>;
  // Admin permissions helpers
  listAdminPermissions?: () => Promise<any[]>;
  setAdminPermission?: (userId: string, patch: Partial<AdminPermission>) => Promise<void>;
  // Permissions
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
  } | null;
  // Diagnostics for event reordering failures
  lastEventReorderError?: { phase: string; message?: string; details?: string; hint?: string } | null;
}

// React context + provider
const DataContext = React.createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  
  // Primary collections
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCoordinators, setEventCoordinators] = useState<EventCoordinator[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sponsorshipSettings, setSponsorshipSettings] = useState<SponsorshipSettings | null>(null);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [eventWinners, setEventWinners] = useState<Array<{
    id: number;
    event_id: number | null;
    category: string | null;
    position: number;
    name: string;
    photo_url: string | null;
    created_at: string;
  }>>([]);
  const [facultyHeads, setFacultyHeads] = useState<FacultyHead[]>([]);
  const [coreCommittees, setCoreCommittees] = useState<CoreCommittee[]>([]);
  const [coreTeamMembers, setCoreTeamMembers] = useState<CoreTeamMember[]>([]);
  const [sportsCommittees, setSportsCommittees] = useState<SportsCommittee[]>([]);
  const [sportsTeamMembers, setSportsTeamMembers] = useState<SportsTeamMember[]>([]);
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);

  const [chiefGuests, setChiefGuests] = useState<ChiefGuest[]>([]);
  const [sponsorshipPackages, setSponsorshipPackages] = useState<SponsorshipPackage[]>([]);
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [socialMediaSettings, setSocialMediaSettings] = useState<SocialMediaSettings | null>(null);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [homeboundSettings, setHomeboundSettings] = useState<HomeboundSettings | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [aboutSettings, setAboutSettings] = useState<AboutSettings | null>(null);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(null);
  const [myPermissions, setMyPermissions] = useState<{
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
  } | null>(null);
  const [roadmapMilestones, setRoadmapMilestones] = useState<RoadmapMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroMedia, setHeroMedia] = useState<Partial<Record<PageKey, HeroMedia | null>>>({});
  const [connectionStatus, setConnectionStatus] = useState<'ok' | 'degraded' | 'offline'>('ok');
  const [lastError, setLastError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastEventReorderError, setLastEventReorderError] = useState<null | { phase: string; message?: string; details?: string; hint?: string }>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<Record<string, string>>({});
  const [schemaCapabilities, setSchemaCapabilities] = useState({
    events_registration_photo_required: true,
    events_registration_photo_label: true,
    registrations_photo_url: true,
    storage_registration_photos_bucket: true,
    events_winners_display_mode: true,
  });

  const [adminUsers, setAdminUsers] = useState<Array<{ user_id: string; email: string; created_at: string; role?: 'owner' | 'admin'; is_primary?: boolean }>>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [suppressPublicNotifications, setSuppressPublicNotifications] = useState<boolean>(false);

  const { user: authUser } = useAuth();
  const isMasterBypass = !!authUser?.user_metadata?.master_bypass || authUser?.id === 'master-admin-bypass';

  const fetchAdminUsersViaBypass = useCallback(async () => {
    if (!isMasterBypass) {
      setAdminUsers([]);
      return;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/.netlify/functions/list-admin-users', {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to fetch admin users');
      }
      const rows = await response.json();
      if (Array.isArray(rows)) {
        setAdminUsers(rows as any);
      } else {
        setAdminUsers([]);
      }
    } catch (err) {
      console.warn('Admin list bypass fetch failed', err);
      setAdminUsers([]);
    }
  }, [isMasterBypass]);
  // Admin users list (optional convenience for admin panel)
  // Reconnection helpers
  const lastFetchAtRef = React.useRef<number>(0);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = React.useRef<number>(0);
  // Feature detection: whether events table supports timer columns yet
  const timersSupportedRef = React.useRef<boolean>(true);
  // Auto-open guard: ensure we only auto-open an event once per openAt timestamp
  const autoOpenedRef = React.useRef<Set<string>>(new Set());
  // Track realtime channels to support resubscription on demand
  const realtimeChannelsRef = React.useRef<Set<any>>(new Set());
  // Debounce resubscribe if multiple channels error/close at once
  const resubscribePendingRef = React.useRef<boolean>(false);
  // Warm-up window: suppress degraded/offline banner for brief startup hiccups
  // Configurable via VITE_CONNECTION_WARMUP_MS (defaults to 40s) to avoid initial degraded/Load failed flash on cold start
  const warmupMs = (() => {
    try {
      const v = (import.meta as any)?.env?.VITE_CONNECTION_WARMUP_MS;
      const n = Number(v);
      if (!Number.isNaN(n) && n > 0) return Math.min(n, 120_000); // cap at 2 minutes for safety
    } catch {}
    return 40_000; // default 40s
  })();
  const warmupUntilRef = React.useRef<number>(Date.now() + warmupMs);
  const withinWarmup = () => Date.now() < warmupUntilRef.current;
  // Count consecutive failing fetch cycles to avoid flashing degraded/offline for single blips
  const failStreakRef = React.useRef<number>(0);
  const scheduleResubscribe = (reason?: string) => {
    try {
      if (reason && !lastError) setLastError(reason);
      // Do not force degraded here; let fetchData aggregate errors and apply thresholds
    } catch {}
    if (resubscribePendingRef.current) return;
    resubscribePendingRef.current = true;
    setTimeout(() => {
      resubscribePendingRef.current = false;
      resubscribeRealtime();
    }, 500);
  };
  const resubscribeRealtime = () => {
    try {
      for (const ch of Array.from(realtimeChannelsRef.current)) {
        try { supabase.removeChannel(ch); } catch {}
      }
      realtimeChannelsRef.current.clear();
      // Mark all known channels as resubscribing
      setRealtimeStatus((prev) => {
        const next: Record<string, string> = { ...prev };
        Object.keys(next).forEach((k) => {
          next[k] = 'SUBSCRIBING';
        });
        return next;
      });
      fetchData(true).catch(() => {});
    } catch {}
  };

  const autoOpenKey = (id: number, openAtIso: string) => `event:auto-opened:${id}:${openAtIso}`;
  const hasAutoOpened = (id: number, openAtIso: string): boolean => {
    const key = autoOpenKey(id, openAtIso);
    if (autoOpenedRef.current.has(key)) return true;
    try {
      return localStorage.getItem(key) === '1';
    } catch { return false; }
  };

  // --- Storage helpers (generic + registration photos) ---
  const REG_PHOTOS_BUCKET = 'registration-photos';
  const publicUrlFor = (bucket: string, name: string) => {
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(name);
      if (data && data.publicUrl) return data.publicUrl;
    } catch {}
    // Fallback: build absolute URL from host
    const host = String(SUPABASE_HOST || '').trim();
    const base = /^https?:\/\//.test(host) ? host : `https://${host}`;
    return `${base}/storage/v1/object/public/${bucket}/${name}`;
  };

  // Optional storage quota from env (GB) for display: VITE_SUPABASE_STORAGE_QUOTA_GB or exact BYTES
  const storageQuotaBytes: number | null = (() => {
    try {
      const gb = (import.meta as any)?.env?.VITE_SUPABASE_STORAGE_QUOTA_GB;
      const by = (import.meta as any)?.env?.VITE_SUPABASE_STORAGE_QUOTA_BYTES;
      if (by && !isNaN(Number(by))) return Number(by);
      if (gb && !isNaN(Number(gb))) return Math.floor(Number(gb) * 1024 * 1024 * 1024);
    } catch {}
    return null;
  })();

  // Detect once whether PostgREST exposes the `storage` schema (storage.buckets/objects).
  // To prevent repeated 404s in environments where `storage` schema is hidden, we DISABLE the probe by default.
  // Set VITE_ENABLE_STORAGE_CAPABILITY_PROBE=true to run a single cached probe.
  // Deprecated probe: instead of pre-probing, we optimistically attempt storage.* tables and safely fall back on error.
  // Keeping refs for future feature flags if needed.
  // Note: legacy ref removed; no longer used after optimistic access refactor

  // Recursively list all files in a bucket using the Storage API. This works even when
  // direct access to storage.objects is restricted by RLS, and includes nested folders.
  function listAllObjectsViaStorageAPI(
    bucket: string,
    prefix: string
  ): Promise<Array<{ fullPath: string; created_at: string | null; size: number; publicUrl: string }>> {
    return new Promise(async (resolve) => {
      const results: Array<{ fullPath: string; created_at: string | null; size: number; publicUrl: string }> = [];
      const stack: string[] = [prefix];
      const LIMIT = 1000;
      while (stack.length > 0) {
        const path = stack.pop() as string; // e.g. '' or 'folder/'
        let offset = 0;
        // Normalize: Supabase expects no leading slash; folder paths end with '/'
        const normalized = path && !path.endsWith('/') ? path + '/' : path;
        // Paginate through this level
        while (true) {
          const { data: list, error } = await supabase.storage.from(bucket).list(normalized, {
            limit: LIMIT,
            offset,
            sortBy: { column: 'updated_at', order: 'desc' },
          });
          if (error || !list || list.length === 0) break;
          for (const entry of list as any[]) {
            const isFolder = !entry?.id; // folders have null id; files have id
            if (isFolder) {
              // Dive into subfolder (entry.name already excludes normalized prefix)
              stack.push((normalized ?? '') + entry.name);
            } else {
              const fullPath = (normalized ?? '') + entry.name;
              const created = (entry?.created_at ?? entry?.updated_at ?? entry?.last_accessed_at ?? null) as string | null;
              const size = Number(entry?.metadata?.size ?? entry?.metadata?.ContentLength ?? 0) || 0;
              results.push({
                fullPath,
                created_at: created,
                size,
                publicUrl: publicUrlFor(bucket, fullPath),
              });
            }
          }
          // paginate
          if (list.length < LIMIT) break;
          offset += list.length;
        }
      }
      resolve(results);
    });
  }

  // Simple sessionStorage cache for expensive recursive listings
  const getCachedBucketIndex = (bucket: string) => {
    try {
      const raw = sessionStorage.getItem(`bucket_index:${bucket}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const { ts, items } = parsed || {};
      // 2-minute TTL to keep UI snappy while reflecting recent uploads/deletes
      if (!ts || Date.now() - Number(ts) > 120_000) return null;
      if (!Array.isArray(items)) return null;
      return items as Array<{ fullPath: string; created_at: string | null; size: number; publicUrl: string }>;
    } catch { return null; }
  };
  const setCachedBucketIndex = (
    bucket: string,
    items: Array<{ fullPath: string; created_at: string | null; size: number; publicUrl: string }>
  ) => {
    try {
      sessionStorage.setItem(`bucket_index:${bucket}` , JSON.stringify({ ts: Date.now(), items }));
    } catch {}
  };

  // --- Admin users helpers ---
  const refreshAdminUsers = async () => {
    const fallback = async () => {
      await fetchAdminUsersViaBypass();
    };

    try {
      const { data } = await supabase.auth.getUser();
      const sessionUser = data.user;
      if (!sessionUser) {
        await fallback();
        return;
      }
    } catch {
      await fallback();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users' as any)
        .select('user_id,email,created_at,role,is_primary')
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        setAdminUsers(data as any);
      } else {
        await fallback();
      }
    } catch {
      await fallback();
    }
  };

  const listAdminPermissions = async () => {
    // Skip when unauthenticated to avoid 400s from RLS or bad filters
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return [] as any[];
    } catch { return [] as any[]; }
    const { data, error } = await supabase
      .from('admin_permissions' as any)
      .select('*');
    if (error) throw new Error(error.message);
    return (data || []) as any;
  };

  const setAdminPermission = async (userId: string, patch: Partial<AdminPermission>) => {
    // Owner-only: server-side RLS enforces this
    const payload: any = { user_id: userId, ...patch };
    const { error } = await supabase.from('admin_permissions' as any).upsert(payload, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  };

  const addAdminUser = async (userId: string, email: string) => {
    if (!userId || !email) throw new Error('User ID and email are required');
    const { error } = await supabase.from('admin_users' as any).insert([{ user_id: userId, email }]);
    if (error) {
      // Fallback: Try bypass for Mock Owner
      const res = await fetch('/.netlify/functions/add-admin-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email })
      });
      if (!res.ok) throw new Error(error.message || 'Failed to add admin');
    }
    await refreshAdminUsers();
  };

  const removeAdminUser = async (userId: string) => {
    const { error } = await supabase.from('admin_users' as any).delete().eq('user_id', userId);
    if (error) {
      // Fallback: Try bypass for Mock Owner
      const res = await fetch('/.netlify/functions/delete-admin-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (!res.ok) throw new Error(error.message || 'Failed to remove admin');
    }
    await refreshAdminUsers();
  };

  const addAdminByEmail = async (email: string) => {
    if (!email) throw new Error('Email is required');
    const { error } = await supabase.rpc('add_admin_by_email', { p_email: email });
    if (error) {
      // Fallback: Try bypass for Mock Owner
      const res = await fetch('/.netlify/functions/add-admin-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error(error.message || 'Failed to add admin by email');
    }
    await refreshAdminUsers();
  };

  const createAdminAccount = async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email and password are required');
    // Requires the caller to be OWNER; server will validate using the current access token
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Fallback for Mock Owner - removed insecure key
    // headers['x-master-key'] = '9693';
    }

    const resp = await fetch('/.netlify/functions/create-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || 'Failed to create admin');
    }
    const json = await resp.json();
    await refreshAdminUsers();
    return json;
  };

  const updateAdminEmail = async (userId: string, newEmail: string) => {
    if (!userId || !newEmail) throw new Error('User ID and new email are required');
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // headers['x-master-key'] = '9693';
    }

    const resp = await fetch('/.netlify/functions/update-admin-email', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, newEmail }),
    });
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || 'Failed to update admin email');
    }
    await refreshAdminUsers();
  };

  // Ensure image previews work for private buckets by signing URLs when needed
  async function ensurePreviewUrls(
    bucket: string,
    items: Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>
  ): Promise<Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>> {
    if (!items.length) return items;
    // Always try to create signed URLs; if the call fails (e.g., no permission), fall back to original URLs.
    try {
      const paths = items.map((i) => i.name);
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 15); // 15 minutes
      if (!error && Array.isArray(data)) {
        const map = new Map<string, string>();
        for (const r of data as any[]) {
          const p = String(r?.path ?? r?.pathname ?? '');
          const u = String(r?.signedUrl ?? r?.signedURL ?? '');
          if (p && u) map.set(p, u);
        }
        return items.map((i) => ({ ...i, publicUrl: map.get(i.name) || i.publicUrl }));
      }
    } catch {}
    return items;
  }

  // Generic: list objects in a bucket with size when available.
  const getBucketObjects = async (bucket: string, page = 1, pageSize = 50) => {
    // Prefer storage.objects; try directly and fallback if not accessible
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // First try: PostgREST table `storage.objects` (flattens folders, gives total count)
    try {
      const { data, error, count } = await supabase
        .from('storage.objects')
        .select('name, created_at, updated_at, metadata', { count: 'exact' })
        .eq('bucket_id', bucket)
        .range(from, to);

      if (!error && data) {
        let items = (data || []).map((row: any) => ({
          name: row.name as string,
          created_at: (row.created_at || row.updated_at) as string | null,
          size: Number(row?.metadata?.size ?? row?.metadata?.ContentLength ?? 0) || 0,
          publicUrl: publicUrlFor(bucket, row.name as string),
        }));
        items = await ensurePreviewUrls(bucket, items);
        return { items, total: count ?? items.length };
      }
    } catch (e) {
      console.warn('PostgREST storage.objects list failed, falling back to Storage API', e);
    }

    // Fallback: use the Storage API (supabase.storage.from(bucket).list)
    // This avoids calling PostgREST endpoints like /rest/v1/storage.objects which may be disabled
    try {
      const offset = from;
      const { data: list, error } = await supabase.storage.from(bucket).list('', {
        limit: pageSize,
        offset,
        sortBy: { column: 'updated_at', order: 'desc' },
      });
      if (!error && Array.isArray(list) && list.length > 0) {
        const items = (list || []).map((entry: any) => ({
          name: entry.name as string,
          created_at: (entry?.created_at ?? entry?.updated_at ?? null) as string | null,
          size: Number(entry?.metadata?.size ?? entry?.metadata?.ContentLength ?? 0) || 0,
          publicUrl: publicUrlFor(bucket, entry.name as string),
        }));
        const signed = await ensurePreviewUrls(bucket, items);
        // Storage API doesn't provide a total count, so return the current page length as total fallback
        return { items: signed, total: signed.length };
      }
    } catch (e) {
      // If Storage API listing fails, fall through to try recursive below
    }

    // Fallback: recursively list via Storage API (supports nested folders). Cache to avoid repeated heavy scans.
    const cached = getCachedBucketIndex(bucket);
    const all = cached ?? await listAllObjectsViaStorageAPI(bucket, '');
    if (!cached) setCachedBucketIndex(bucket, all);
    // Sort by created_at desc then name
    all.sort((a, b) => {
      const at = (a.created_at ? new Date(a.created_at).getTime() : 0);
      const bt = (b.created_at ? new Date(b.created_at).getTime() : 0);
      if (bt !== at) return bt - at;
      return a.fullPath.localeCompare(b.fullPath);
    });
    const total = all.length;
    const slice = all.slice(from, from + pageSize);
    let items = slice.map((f) => ({
      name: f.fullPath,
      created_at: f.created_at,
      size: f.size,
      publicUrl: f.publicUrl,
    }));
    items = await ensurePreviewUrls(bucket, items);
    return { items, total };
  };

  const computeBucketUsage = async (bucket: string) => {
    // Use storage.objects in pages to sum sizes when available; fallback to Storage API
    const pageSize = 1000;
    let page = 1;
    let totalBytes = 0;
    let count = 0;
    while (true) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      try {
        const { data, error } = await supabase
          .from('storage.objects')
          .select('metadata')
          .eq('bucket_id', bucket)
          .range(from, to);
        if (error) break;
        const rows = data || [];
        if (rows.length === 0) break;
        for (const r of rows as any[]) {
          // Defensive check for metadata structure
          const meta = r?.metadata || {};
          const sz = Number(meta.size ?? meta.ContentLength ?? 0) || 0;
          if (sz > 0) totalBytes += sz;
          count += 1;
        }
        if (rows.length < pageSize) break;
        page += 1;
      } catch {
        break;
      }
    }
    // If storage.objects was inaccessible or empty, fall back to Storage API recursive listing
    if (count === 0 && totalBytes === 0) {
      try {
        const all = getCachedBucketIndex(bucket) ?? await listAllObjectsViaStorageAPI(bucket, '');
        if (!getCachedBucketIndex(bucket)) setCachedBucketIndex(bucket, all);
        let sum = 0;
        for (const f of all) sum += (Number(f.size) || 0);
        return { totalBytes: sum, count: all.length };
      } catch {
        // keep zeros
      }
    }
    return { totalBytes, count };
  };

  // List all storage buckets, prefer storage.buckets
  const listStorageBuckets = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('storage.buckets' as any)
        .select('id')
        .order('id', { ascending: true });
      if (!error && data) {
        const ids = (data as any[]).map((r) => r.id as string).filter(Boolean);
        return Array.from(new Set(ids));
      }
    } catch {}
    // Fallback to known buckets we operate with
    return Array.from(new Set(KNOWN_BUCKETS));
  };

  const computeAllBucketsUsage = async (): Promise<{ totalBytes: number; count: number }> => {
    const buckets = await listStorageBuckets();
    let totalBytes = 0;
    let count = 0;
    for (const b of buckets) {
      try {
        const u = await computeBucketUsage(b);
        totalBytes += u.totalBytes;
        count += u.count;
      } catch {}
    }
    return { totalBytes, count };
  };


  const deleteBucketObject = async (bucket: string, name: string) => {
    // Recursive delete strategy: collect all paths first
    const pathsToDelete: string[] = [name];

    const collectPaths = async (prefix: string) => {
      try {
        const { data: items } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
        if (!items || items.length === 0) return;
        
        for (const item of items) {
            // If item.name is just the file name, we need to append it to prefix
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            pathsToDelete.push(fullPath);
            // Recurse to find deeper children
            await collectPaths(fullPath);
        }
      } catch (e) {
        console.warn('Error recursing', prefix, e);
      }
    };

    // Start recursion from the item name
    await collectPaths(name);

    // Unique paths
    const uniquePaths = Array.from(new Set(pathsToDelete));
    let clearedRefs = 0;

    // Clear references for ALL found paths
    for (const path of uniquePaths) {
        const publicUrl = publicUrlFor(bucket, path);
        try {
          // registrations.photo_url
          const { data: r1, error: e1 } = await supabase.from('registrations').update({ photo_url: null } as any).eq('photo_url', publicUrl).select('id');
          if (!e1) clearedRefs += (r1?.length || 0);
          // sponsors.logo
          const { data: r2, error: e2 } = await supabase.from('sponsors').update({ logo: null } as any).eq('logo', publicUrl).select('id');
          if (!e2) clearedRefs += (r2?.length || 0);
          // gallery_images.src
          const { data: r3, error: e3 } = await supabase.from('gallery_images').update({ src: null } as any).eq('src', publicUrl).select('id');
          if (!e3) clearedRefs += (r3?.length || 0);
          // event_winners.photo_url
          try {
            const { data: r4, error: e4 } = await supabase.from('event_winners').update({ photo_url: null } as any).eq('photo_url', publicUrl).select('id');
            if (!e4) clearedRefs += (r4?.length || 0);
          } catch {}
        } catch (e) {
          console.warn('Failed to clear references for', publicUrl, e);
        }
    }

    // Batch delete from storage
    let allOk = true;
    // Chunk into 50s
    for (let i = 0; i < uniquePaths.length; i += 50) {
        const batch = uniquePaths.slice(i, i + 50);
        const { error: delErr } = await supabase.storage.from(bucket).remove(batch);
        if (delErr) {
            console.warn('Delete batch failed', batch, delErr);
            allOk = false;
        }
    }

    return { ok: allOk, clearedRefs };
  };

  // Registration-specific thin wrappers
  const getRegistrationPhotos = (page = 1, pageSize = 50) => getBucketObjects(REG_PHOTOS_BUCKET, page, pageSize);
  const computeRegistrationPhotosUsage = () => computeBucketUsage(REG_PHOTOS_BUCKET);
  const deleteRegistrationPhoto = (name: string) => deleteBucketObject(REG_PHOTOS_BUCKET, name);
  const markAutoOpened = (id: number, openAtIso: string) => {
    const key = autoOpenKey(id, openAtIso);
    autoOpenedRef.current.add(key);
    try { localStorage.setItem(key, '1'); } catch {}
  };

  const isAutoOpenEnabled = (): boolean => {
    try {
      const raw = localStorage.getItem('admin_auto_open_enabled');
      if (raw === null) return false; // default disabled until admin opts in
      return raw === 'true' || raw === '1';
    } catch {
      return false;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  // Normalize potentially problematic image/asset URLs so they work on HTTPS production
  const sanitizeUrl = (u: string | null | undefined): string => {
    if (!u) return '';
    let s = String(u).trim();
    if (!s) return '';
    // Prefix relative Supabase storage paths with our Supabase origin
    // Example: /storage/v1/object/public/bucket/path -> https://<project>.supabase.co/storage/v1/object/public/...
    if (s.startsWith('/storage/')) {
      const origin = `https://${SUPABASE_HOST}`;
      s = origin + s;
    }
    // Avoid mixed content on Netlify (https site loading http images)
    try {
      const url = new URL(s);
      // Block local file access which causes ERR_FILE_NOT_FOUND and security warnings
      if (url.protocol === 'file:') return '';
      
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && url.protocol === 'http:') {
        url.protocol = 'https:';
        s = url.toString();
      }

      // Supabase Image Transformation for rendering optimization
      // If it's a Supabase Storage URL, append transformation params to ensure we don't load massive originals
      // Only apply if not already transformed (no ?width or ?height)
      if (s.includes('/storage/v1/object/public/') && !s.includes('?')) {
         // Default to a reasonable max width for web (e.g. 1200px) and WebP format
         // This ensures that even if a user uploaded a 10MB 4000px image, the browser gets a 100KB 1200px WebP
         // Note: This requires Supabase Image Transformations to be enabled on the project.
         // If not enabled, these params are just ignored by standard storage.
         s = `${s}?width=1200&resize=contain&format=webp`;
      }

    } catch {
      // s might be a relative path that isn't storage; keep as-is
    }
    return s;
  };

  // Configuration issues are handled in supabase.ts; avoid marking degraded solely due to env, since defaults are provided.
  useEffect(() => {
    // no-op: DataContext relies on actual network errors to set connectionStatus
  }, []);

  // Realtime: keep auditions list in sync (insert/update/delete)
  useEffect(() => {
    const channelName = 'ctx-auditions';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auditions' }, (payload: any) => {
        setAuditions((cur) => {
          const row = (payload.new || payload.old) as Audition;
          if (payload.eventType === 'INSERT') {
            if (cur.find((r) => r.id === row.id)) return cur; // avoid dup
            // Keep newest first
            return [row, ...cur];
          }
          if (payload.eventType === 'UPDATE') {
            return cur.map((r) => (r.id === row.id ? { ...r, ...row } : r));
          }
          if (payload.eventType === 'DELETE') {
            return cur.filter((r) => r.id !== row.id);
          }
          return cur;
        });
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) auditions`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Auto-open registration after timer passes (optional behavior)
  useEffect(() => {
    if (!events || events.length === 0) return;
    let stopped = false;
    const tick = async () => {
      // Respect admin toggle
      if (!isAutoOpenEnabled()) return;
      if (stopped) return;
      const now = Date.now();
      const due = events.filter((e: any) => {
        if (!e) return false;
        if (!e.registration_timer_enabled) return false;
        if (!e.registration_opens_at) return false;
        if (e.registration_open) return false; // already open
        const openAt = new Date(e.registration_opens_at).getTime();
        if (Number.isNaN(openAt)) return false;
        if (now < openAt) return false;
        // open time passed; ensure we haven't auto-opened this (for this exact timestamp) already
        return !hasAutoOpened(e.id, new Date(e.registration_opens_at).toISOString());
      });
      for (const e of due) {
        try {
          const { error } = await supabase.from('events').update({ registration_open: true }).eq('id', e.id);
          if (!error) {
            markAutoOpened(e.id, new Date((e as any).registration_opens_at).toISOString());
          } else {
            console.warn('Auto-open failed for event', e.id, error.message);
          }
        } catch (err) {
          console.warn('Auto-open threw for event', (e as any)?.id, err);
        }
      }
    };
    // Check every second so UI flips quickly at boundary time
    const interval = setInterval(tick, 1000);
    // Run an immediate check as well
    tick();
    return () => { stopped = true; clearInterval(interval); };
  }, [events]);

  // Keepalive ping: periodically perform a cheap HEAD-like select to keep the connection warm
  useEffect(() => {
    let stopped = false;
    const interval = setInterval(async () => {
      try {
        // Skip background tabs to save resources
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const { error } = await supabase.from('events').select('id', { head: true, count: 'exact' });
        const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (!error && !stopped) setLatencyMs(Math.round(t1 - t0));
      } catch {
        // ignore: keepalive is best-effort
      }
    }, 20_000); // 20s for faster recovery indication
    return () => { stopped = true; clearInterval(interval); };
  }, []);

  const scheduleRetry = () => {
    clearRetryTimer();
    // Exponential backoff: 2s, 4s, 8s ... capped at 60s
    const attempt = retryAttemptRef.current;
    const delay = Math.min(60000, 2000 * Math.pow(2, attempt));
    retryTimerRef.current = setTimeout(async () => {
      try {
        await fetchData(true);
      } finally {
        // Increase attempt only if we still aren't OK; will reset on success
        if (connectionStatus !== 'ok') {
          retryAttemptRef.current = Math.min(retryAttemptRef.current + 1, 10);
          scheduleRetry();
        }
      }
    }, delay);
  };

  // Manual ping to quickly measure latency and hint reconnection
  const pingNow = async () => {
    try {
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const { error } = await supabase.from('events').select('id', { head: true, count: 'exact' });
      const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (!error) {
        setLatencyMs(Math.round(t1 - t0));
        // Successful ping is a strong signal; move to OK (will be confirmed by next fetch)
        if (!withinWarmup()) setConnectionStatus('ok');
        failStreakRef.current = 0;
      } else {
        setLastError(`Ping error: ${error.message || String(error)}`);
        // Don't flip status on a single ping error; fetch cycle will decide using thresholds
      }
    } catch (e: any) {
      setLastError(`Ping threw: ${e?.message || String(e)}`);
      // Don't flip status on a single ping error; fetch cycle will decide
    }
  };

  const fetchData = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    let hadErrors = false;
    const markErr = (label: string, err: any) => {
      hadErrors = true;
      const msg = (err && (err.message || err.toString())) || 'Unknown error';
      // keep last error message for UI
      setLastError(`${label}: ${msg}`);
      console.error(label, err);
    };
    try {
      // Lightweight connectivity ping first to catch obvious offline issues
      try {
        if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator && !navigator.onLine) {
          throw new Error('Browser offline');
        }
        const t0 = performance.now();
        // Avoid HEAD requests which can trigger Safari "TypeError: Load failed"; do a tiny GET instead
        const { error: pingError } = await supabase
          .from('events')
          .select('id', { count: 'exact' })
          .range(0, 0); // fetch at most 1 row
        const dt = performance.now() - t0;
        if (!pingError) setLatencyMs(Math.round(dt));
        if (pingError) markErr('Supabase ping failed', pingError);
      } catch (e) { markErr('Supabase ping threw', e); }
      // Schema/bucket detection for registration photo feature
      try {
        const trySelectHead = async (table: string, column: string) => {
          // Use a minimal GET instead of HEAD to avoid Safari "Load failed" on HEAD
          const { error } = await supabase
            .from(table as any)
            .select(column as any, { count: 'exact' })
            .range(0, 0);
          return !error;
        };
        const [reqOk, labelOk, photoUrlOk, winnersModeOk] = await Promise.all([
          trySelectHead('events', 'registration_photo_required'),
          trySelectHead('events', 'registration_photo_label'),
          trySelectHead('registrations', 'photo_url'),
          trySelectHead('events', 'winners_display_mode'),
        ]);
        let bucketOk = true;
        try {
          const { error: bErr } = await supabase.storage.from('registration-photos').list('', { limit: 1 });
          if (bErr) bucketOk = false;
        } catch {
          bucketOk = false;
        }
        setSchemaCapabilities({
          events_registration_photo_required: !!reqOk,
          events_registration_photo_label: !!labelOk,
          registrations_photo_url: !!photoUrlOk,
          storage_registration_photos_bucket: !!bucketOk,
          events_winners_display_mode: !!winnersModeOk,
        });
      } catch (e) {
        console.warn('Schema detection failed', e);
      }
      // Parallelize independent fetches to speed up initial load
      // Group 1: Critical data for Home/Events/Layout
      const [
        eventsRes,
        heroMediaRes,
        homepageSettingsRes,
        siteSettingsRes,
        formSettingsRes,
        registrationsRes,
        eventCategoriesRes,
        sponsorsRes,
        scheduleDaysRes,
        notificationsRes
      ] = await Promise.all([
        // Events (ordered)
        (async () => {
          try {
            let { data, error } = await supabase.from('events').select('*').order('display_order', { ascending: true });
            if (error && String(error.message || '').toLowerCase().includes('display_order')) {
              const retry = await supabase.from('events').select('*');
              data = retry.data; error = retry.error;
            }
            return { data, error };
          } catch (e) { return { data: null, error: e }; }
        })(),
        // Hero Media
        supabase.from('hero_media').select('*'),
        // Homepage Settings
        supabase.from('homepage_settings').select('*').eq('id', 1).maybeSingle(),
        // Site Settings
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        // Form Settings
        supabase.from('form_settings').select('*').eq('id', 1).single(),
        // Registrations (needed for winners)
        supabase.from('registrations').select('*'),
        // Event Categories
        supabase.from('event_categories').select('*'),
        // Sponsors
        supabase.from('sponsors').select('*'),
        // Schedule
        supabase.from('schedule_days').select('*, schedule_events (*)').order('date', { ascending: true }),
        // Notifications
        (async () => {
          const nowIso = new Date().toISOString();
          return supabase.from('notifications').select('*').eq('visible', true).lte('starts_at', nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`).order('priority', { ascending: false }).order('created_at', { ascending: false });
        })()
      ]);

      // Process Group 1 Results
      // Events
      if (eventsRes.error) markErr('Error fetching events', eventsRes.error);
      else {
        const mapped = (eventsRes.data || []).map((e: any) => ({ ...e, image: sanitizeUrl(e.image) }));
        mapped.sort((a: any, b: any) => {
          const da = (a.display_order ?? Infinity);
          const db = (b.display_order ?? Infinity);
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (ca !== cb) return cb - ca;
          return 0;
        });
        setEvents(mapped as Event[]);
      }

      // Registrations (Decrypt sensitive data)
      if (registrationsRes.error) markErr('Error fetching registrations', registrationsRes.error);
      else {
        const decryptedRegistrations = (registrationsRes.data || []).map((r: any) => ({
          ...r,
          email: decryptData(r.email),
          phone: decryptData(r.phone),
          college: decryptData(r.college),
          // Decrypt team members if stored as JSON string or array of objects with PII
          // Currently team_members is often just names, but if we encrypt fields there, we'd need to handle it.
          // For now, we only encrypt top-level PII fields as per plan.
        }));
        // Sort by date desc
        decryptedRegistrations.sort((a: any, b: any) => new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime());
        setRegistrations(decryptedRegistrations as Registration[]);
      }
      const currentRegistrations = registrationsRes.data || []; // Capture for dependency (using raw data for winners mapping if needed, or decrypted? Winners mapping uses ID, so raw is fine, but if it needs names, decrypted is better. Let's use decrypted if available, but here we are in the else block. Let's define it outside.)

      // Hero Media
      if (heroMediaRes.error) {
        // ...existing error handling logic for hero_media...
        const rawMsg = (heroMediaRes.error as any)?.message || '';
        const msg = String(rawMsg).toLowerCase();
        const code = (heroMediaRes.error as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.hero_media' does not exist") || (msg.includes('could not find the table') && msg.includes('hero_media'));
        const isTransientNetwork = msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
        const isPermissionish = msg.includes('permission') || msg.includes('policy') || msg.includes('anonymous');
        if (isMissingTable || isTransientNetwork || isPermissionish) {
          console.warn('[Data] hero_media fetch non-critical issue; using empty set:', rawMsg);
          setHeroMedia({});
        } else {
          markErr('Error fetching hero media', heroMediaRes.error);
        }
      } else {
        const map: Partial<Record<PageKey, HeroMedia | null>> = {};
        (heroMediaRes.data || []).forEach((row: any) => {
          const patched = {
            ...row,
            image_url: sanitizeUrl(row.image_url),
            mobile_image_url: sanitizeUrl(row.mobile_image_url),
            video_url: sanitizeUrl(row.video_url),
          } as HeroMedia;
          map[row.page_key as PageKey] = patched;
        });
        setHeroMedia(map);
      }

      // Homepage Settings
      if (homepageSettingsRes.error) markErr('Error fetching homepage settings', homepageSettingsRes.error);
      else setHomepageSettings(homepageSettingsRes.data || null);

      // Site Settings
      if (siteSettingsRes.error) {
        // ...existing error handling logic for site_settings...
        const ssErr = siteSettingsRes.error;
        const raw = (ssErr as any)?.message || String(ssErr);
        const msg = String(raw).toLowerCase();
        const code = (ssErr as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.site_settings' does not exist") || (msg.includes('could not find the table') && msg.includes('site_settings'));
        const isTransientNetwork = msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
        const isPermissionish = msg.includes('permission') || msg.includes('policy') || msg.includes('anonymous');
        if (isMissingTable || isTransientNetwork || isPermissionish) {
          console.warn('[Data] site_settings non-critical issue; using null:', raw);
          setSiteSettings(null);
        } else {
          markErr('Error fetching site settings', ssErr);
        }
      } else {
        setSiteSettings(siteSettingsRes.data || null);
      }

      // Form Settings
      if (formSettingsRes.error) markErr('Error fetching form settings', formSettingsRes.error);
      else setFormSettings(formSettingsRes.data || null);



      // Event Categories
      if (eventCategoriesRes.error) markErr('Error fetching event categories', eventCategoriesRes.error);
      else setEventCategories(eventCategoriesRes.data || []);

      // Sponsors
      if (sponsorsRes.error) markErr('Error fetching sponsors', sponsorsRes.error);
      else setSponsors((sponsorsRes.data || []).map((s: any) => ({ ...s, logo: sanitizeUrl(s.logo) })));

      // Schedule
      if (scheduleDaysRes.error) markErr('Error fetching schedule days', scheduleDaysRes.error);
      else {
        const transformedSchedule = (scheduleDaysRes.data || []).map((day: any) => ({
          ...day,
          events: day.schedule_events || []
        }));
        setSchedule(transformedSchedule);
      }

      // Notifications
      if (notificationsRes.error) {
        const lower = String((notificationsRes.error as any)?.message || '').toLowerCase();
        if (lower.includes('relation') && lower.includes('does not exist')) {
          console.warn('[Data] notifications table missing; skipping');
          setNotifications([]);
        } else {
          markErr('Error fetching notifications', notificationsRes.error);
        }
      } else {
        setNotifications(notificationsRes.data || []);
      }

      // Group 2: Secondary data (can load in parallel with Group 1 processing or after)
      // We run this in parallel with the above processing effectively by awaiting a second Promise.all
      const [
        galleryImagesRes,
        aboutSettingsRes,
        homeboundSettingsRes,
        socialMediaSettingsRes,
        facultyHeadsRes,
        coreCommitteesRes,
        coreTeamMembersRes,
        bandMembersRes,
        guestArtistsRes,
        chiefGuestsRes,
        sponsorshipPackagesRes,
        auditionsRes,
        membershipsRes,
        sportsCommitteesRes,
        sportsTeamMembersRes,
        roadmapMilestonesRes,
        gallerySettingsRes,
        eventCoordinatorsRes,
        sponsorshipSettingsRes,
        eventWinnersRes
      ] = await Promise.all([
        supabase.from('gallery_images').select('*'),
        supabase.from('about_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('homebound_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('social_media_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('faculty_heads').select('*'),
        supabase.from('core_committees').select('*'),
        supabase.from('core_team_members').select('*'),
        supabase.from('band_members').select('*').order('order_position', { ascending: true }),
        supabase.from('guest_artists').select('*'),
        supabase.from('chief_guests').select('*').order('order_position', { ascending: true }),
        supabase.from('sponsorship_packages').select('*').order('order_position', { ascending: true }),
        supabase.from('auditions').select('*').order('created_at', { ascending: false }),
        supabase.from('memberships').select('*'),
        supabase.from('sports_committees').select('*').order('order_position', { ascending: true }),
        supabase.from('sports_team_members').select('*').order('order_position', { ascending: true }),
        supabase.from('roadmap_milestones').select('*').order('order_position', { ascending: true }),
        supabase.from('gallery_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('event_coordinators').select('*').order('event_id', { ascending: true }).order('order_position', { ascending: true }),
        supabase.from('sponsorship_settings').select('*, contact_sections (id, type, title, content, icon, enabled, "order")').eq('id', 1).single(),
        supabase.from('event_winners').select('*').order('event_id', { ascending: true }).order('position', { ascending: true })
      ]);

      // Process Group 2 Results
      // Gallery Images
      if (galleryImagesRes.error) {
        // ...existing error handling...
        const rawMsg = (galleryImagesRes.error as any)?.message || '';
        const msg = String(rawMsg).toLowerCase();
        const code = (galleryImagesRes.error as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.gallery_images' does not exist") || (msg.includes('could not find the table') && msg.includes('gallery_images'));
        const isTransientNetwork = msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
        const isPermissionish = msg.includes('permission') || msg.includes('policy') || msg.includes('anonymous');
        if (isMissingTable || isTransientNetwork || isPermissionish) {
          console.warn('[Data] gallery_images fetch non-critical issue; using empty list:', rawMsg);
          setGalleryImages([]);
        } else {
          markErr('Error fetching gallery images', galleryImagesRes.error);
        }
      } else setGalleryImages((galleryImagesRes.data || []).map((g: any) => ({ ...g, src: sanitizeUrl(g.src) })));

      // About Settings
      if (aboutSettingsRes.error) {
        const msg = String(aboutSettingsRes.error.message || '').toLowerCase();
        if (msg.includes('about_settings') && (msg.includes('does not exist') || msg.includes('could not find'))) {
          console.warn('[Data] about_settings table missing; continuing with null');
          setAboutSettings(null);
        } else {
          markErr('Error fetching about settings', aboutSettingsRes.error);
        }
      } else if (aboutSettingsRes.data) {
        const aboutData = aboutSettingsRes.data;
        const normalized: AboutSettings = {
          id: (aboutData as any).id,
          enabled: (aboutData as any).enabled ?? true,
          hero_title: (aboutData as any).hero_title ?? null,
          hero_heading: (aboutData as any).hero_heading ?? null,
          hero_paragraphs: Array.isArray((aboutData as any).hero_paragraphs) ? (aboutData as any).hero_paragraphs : [],
          tracks: Array.isArray((aboutData as any).tracks) ? (aboutData as any).tracks : [],
          tracksLabel: (aboutData as any).tracksLabel ?? null,
          zones: Array.isArray((aboutData as any).zones) ? (aboutData as any).zones : [],
          zonesLabel: (aboutData as any).zonesLabel ?? null,
          stats: Array.isArray((aboutData as any).stats) ? (aboutData as any).stats : [],
          updated_at: (aboutData as any).updated_at ?? null,
        };
        setAboutSettings(normalized);
      } else {
        setAboutSettings(null);
      }

      // Homebound Settings
      if (homeboundSettingsRes.error) markErr('Error fetching homebound settings', homeboundSettingsRes.error);
      else setHomeboundSettings(homeboundSettingsRes.data || null);

      // Social Media Settings
      if (socialMediaSettingsRes.error) markErr('Error fetching social media settings', socialMediaSettingsRes.error);
      else {
        if (socialMediaSettingsRes.data) {
          const d = socialMediaSettingsRes.data;
          const normalized: any = {
            id: (d as any).id,
            instagramEnabled: (d as any).instagram_enabled ?? false,
            instagramUrl: (d as any).instagram_url ?? null,
            youtubeEnabled: (d as any).youtube_enabled ?? false,
            youtubeUrl: (d as any).youtube_url ?? null,
            created_at: (d as any).created_at,
            updated_at: (d as any).updated_at,
          };
          setSocialMediaSettings(normalized as SocialMediaSettings);
        } else {
          setSocialMediaSettings(null);
        }
      }

      // Faculty Heads
      if (facultyHeadsRes.error) markErr('Error fetching faculty heads', facultyHeadsRes.error);
      else setFacultyHeads((facultyHeadsRes.data || []).map((h: any) => ({ ...h, image: sanitizeUrl(h.image) })));

      // Core Committees
      if (coreCommitteesRes.error) markErr('Error fetching core committees', coreCommitteesRes.error);
      else setCoreCommittees(coreCommitteesRes.data || []);

      // Core Team Members
      if (coreTeamMembersRes.error) markErr('Error fetching core team members', coreTeamMembersRes.error);
      else setCoreTeamMembers((coreTeamMembersRes.data || []).map((m: any) => ({
        ...m,
        image: sanitizeUrl(m.image),
        isCouncil: (m.is_council ?? false) as boolean,
      })));

      // Band Members
      if (bandMembersRes.error) markErr('Error fetching band members', bandMembersRes.error);
      else setBandMembers((bandMembersRes.data || []).map((b: any) => ({ ...b, image: sanitizeUrl(b.image) })));

      // Guest Artists
      if (guestArtistsRes.error) markErr('Error fetching guest artists', guestArtistsRes.error);
      else setGuestArtists((guestArtistsRes.data || []).map((a: any) => ({
        ...a,
        image: sanitizeUrl(a.image),
        card_media_url: sanitizeUrl(a.card_media_url),
        detail_music_url: sanitizeUrl(a.detail_music_url)
      })));

      // Chief Guests
      if (chiefGuestsRes.error) markErr('Error fetching chief guests', chiefGuestsRes.error);
      else setChiefGuests((chiefGuestsRes.data || []).map((c: any) => ({ ...c, image: sanitizeUrl(c.image) })));

      // Sponsorship Packages
      if (sponsorshipPackagesRes.error) markErr('Error fetching sponsorship packages', sponsorshipPackagesRes.error);
      else setSponsorshipPackages(sponsorshipPackagesRes.data || []);

      // Auditions
      if (auditionsRes.error) markErr('Error fetching auditions', auditionsRes.error);
      else setAuditions(auditionsRes.data || []);

      // Memberships
      if (membershipsRes.error) {
        // ...existing error handling...
        const rawMsg = (membershipsRes.error as any)?.message || '';
        const msg = String(rawMsg).toLowerCase();
        const code = (membershipsRes.error as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.memberships' does not exist") || (msg.includes('could not find the table') && msg.includes('memberships'));
        const isTransientNetwork = msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
        const isPermissionish = msg.includes('permission') || msg.includes('policy') || msg.includes('anonymous');
        if (isMissingTable || isTransientNetwork || isPermissionish) {
          console.warn('[Data] memberships fetch non-critical issue; using empty list:', rawMsg);
          setMemberships([]);
        } else {
          markErr('Error fetching memberships', membershipsRes.error);
        }
      } else setMemberships(membershipsRes.data || []);

      // Sports Committees
      if (sportsCommitteesRes.error) setSportsCommittees([]); // tolerate missing
      else setSportsCommittees(sportsCommitteesRes.data || []);

      // Sports Team Members
      if (sportsTeamMembersRes.error) setSportsTeamMembers([]); // tolerate missing
      else setSportsTeamMembers(sportsTeamMembersRes.data || []);

      // Roadmap Milestones
      if (roadmapMilestonesRes.error) {
        // ...existing error handling...
        const rawMsg = (roadmapMilestonesRes.error as any)?.message || '';
        const msg = String(rawMsg).toLowerCase();
        const code = (roadmapMilestonesRes.error as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.roadmap_milestones' does not exist") || (msg.includes('could not find the table') && msg.includes('roadmap_milestones'));
        const isTransientNetwork = msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
        const isPermissionish = msg.includes('permission') || msg.includes('policy') || msg.includes('anonymous');
        if (isMissingTable || isTransientNetwork || isPermissionish) {
          console.warn('[Data] roadmap_milestones fetch non-critical issue; using empty list:', rawMsg);
          setRoadmapMilestones([]);
        } else {
          markErr('Error fetching roadmap milestones', roadmapMilestonesRes.error);
        }
      } else setRoadmapMilestones(roadmapMilestonesRes.data || []);

      // Gallery Settings
      if (gallerySettingsRes.error) {
        const msg = String((gallerySettingsRes.error as any)?.message || '').toLowerCase();
        const code = (gallerySettingsRes.error as any)?.code;
        if (code === 'PGRST205' || (msg.includes('could not find the table') && msg.includes('gallery_settings'))) {
          console.warn('[Data] gallery_settings table missing; using defaults');
          setGallerySettings(DEFAULT_GALLERY_SETTINGS);
        } else {
          markErr('Error fetching gallery settings', gallerySettingsRes.error);
        }
      } else setGallerySettings(gallerySettingsRes.data || null);

      // Event Coordinators
      if (eventCoordinatorsRes.error) markErr('Error fetching event coordinators', eventCoordinatorsRes.error);
      else setEventCoordinators(eventCoordinatorsRes.data || []);

      // Sponsorship Settings
      if (sponsorshipSettingsRes.error) {
        // ...existing error handling...
        const rawMsg = (sponsorshipSettingsRes.error as any)?.message || '';
        const msg = String(rawMsg).toLowerCase();
        const code = (sponsorshipSettingsRes.error as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.sponsorship_settings' does not exist") || (msg.includes('could not find the table') && msg.includes('sponsorship_settings'));
        const isTransientNetwork = msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
        const isPermissionish = msg.includes('permission') || msg.includes('policy') || msg.includes('anonymous');
        if (isMissingTable || isTransientNetwork || isPermissionish) {
          console.warn('[Data] sponsorship_settings fetch non-critical issue; using defaults:', rawMsg);
          setSponsorshipSettings(null);
        } else {
          markErr('Error fetching sponsorship settings', sponsorshipSettingsRes.error);
        }
      } else {
        const settingsWithContactSections = {
          ...sponsorshipSettingsRes.data,
          contactSections: (sponsorshipSettingsRes.data as any)?.contact_sections || []
        } as SponsorshipSettings;
        setSponsorshipSettings(settingsWithContactSections);
      }

      // Event Winners (using currentRegistrations from Group 1)
      if (eventWinnersRes.error) {
        const raw = (eventWinnersRes.error as any)?.message || '';
        const msg = String(raw).toLowerCase();
        const code = (eventWinnersRes.error as any)?.code;
        const isMissingTable = code === 'PGRST205' || msg.includes("relation 'public.event_winners' does not exist") || msg.includes('could not find the table') && msg.includes('event_winners');
        if (isMissingTable) {
          console.warn('[Data] event_winners table missing; skipping winners load');
          setEventWinners([]);
        } else {
          markErr('Error fetching event winners', eventWinnersRes.error);
        }
      } else {
        const regsById: Record<string, any> = Object.fromEntries(currentRegistrations.map((r:any) => [r.id, r]));
        setEventWinners((eventWinnersRes.data || []).map((w:any)=>{
          const reg = w.registration_id ? regsById[w.registration_id] : null;
          const registration_year = reg?.year || reg?.batch || null;
          return { ...w, photo_url: sanitizeUrl(w.photo_url), registration_year };
        }));
      }

      // Fetch my permissions (non-critical). Skip when unauthenticated to avoid 400 on eq filter with empty user_id.
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id || null;
        if (!userId) {
          setMyPermissions({});
        } else {
          const { data: permRow } = await supabase
            .from('admin_permissions' as any)
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (permRow) {
          const p: any = permRow as any;
          setMyPermissions({
            can_events: !!p.can_events,
            can_schedule: !!p.can_schedule,
            can_gallery: !!p.can_gallery,
            can_sponsors: !!p.can_sponsors,
            can_registrations: !!p.can_registrations,
            can_registration_photos: !!p.can_registration_photos,
            can_faculty: !!p.can_faculty,
            can_core_team: !!p.can_core_team,
            can_guest_artists: !!p.can_guest_artists,
            can_chief_guests: !!p.can_chief_guests,
            can_homebound: !!p.can_homebound,
            can_sports: !!p.can_sports,
          });
          } else {
            setMyPermissions({});
          }
        }
      } catch { setMyPermissions({}); }

      // Best-effort: fetch admin_users list if permitted (authenticated). Non-critical.
      try {
        await refreshAdminUsers();
      } catch (e) {
        // ignore; RLS may block for anon
      }

    } catch (error) {
      markErr('Error in fetchData', error);
    } finally {
      // Determine connection status from aggregated errors with hysteresis
      if (hadErrors) {
        if (!withinWarmup()) {
          // Increment fail streak on real errors; cap to avoid overflow
          failStreakRef.current = Math.min(failStreakRef.current + 1, 1000);
          const signals = (lastError || '').toLowerCase();
          const looksOffline = /failed to fetch|load failed|network|fetcherror|timeout|abort/.test(signals);
          // Require at least 2 consecutive failing fetch cycles before surfacing degraded/offline
          if (failStreakRef.current >= 2) {
            setConnectionStatus(looksOffline ? 'offline' : 'degraded');
          }
          // else: keep current status (usually 'ok') to avoid flashing on single blips
        }
        // During warmup, keep status at 'ok' but still record lastError
      } else {
        setConnectionStatus('ok');
        setLastError(null);
        // Reset fail streak and retry attempts on success
        failStreakRef.current = 0;
        retryAttemptRef.current = 0;
        clearRetryTimer();
      }
      lastFetchAtRef.current = Date.now();
      if (!silent) setLoading(false);
    }
  };

  // Lightweight prefetch helpers - fetch specific collections in parallel without flipping global loading
  const prefetchEvents = async () => {
    try {
      const [{ data: eventsData }, { data: eventCoordinatorsData }] = await Promise.all([
        supabase.from('events').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('event_coordinators').select('*').order('event_id', { ascending: true }).order('order_position', { ascending: true })
      ] as any);
      if (eventsData) setEvents((eventsData || []).map((e: any) => ({ ...e, image: sanitizeUrl(e.image) })));
      if (eventCoordinatorsData) setEventCoordinators(eventCoordinatorsData || []);
    } catch (e) {
      // ignore — prefetch best-effort
      // console.debug('prefetchEvents failed', e);
    }
  };

  const prefetchGalleryImages = async () => {
    try {
      const { data: galleryImagesData } = await supabase.from('gallery_images').select('*');
      if (galleryImagesData) setGalleryImages((galleryImagesData || []).map((g: any) => ({ ...g, src: sanitizeUrl(g.src) })));
    } catch (e) {
      // ignore — best-effort
    }
  };

  // Single-flight + cooldown for hero media fetches to avoid console spam and tight loops
  const heroFetchInFlight = React.useRef<Map<PageKey, Promise<HeroMedia | null>>>(new Map());
  const heroFetchLastErrorAt = React.useRef<Map<PageKey, number>>(new Map());
  const HERO_FETCH_COOLDOWN_MS = 30_000; // 30s per pageKey after an error

  const fetchHeroMedia = async (pageKey: PageKey): Promise<HeroMedia | null> => {
    // If we already have a value (including null), return it without refetch
    const existing = heroMedia[pageKey];
    if (typeof existing !== 'undefined') return existing as HeroMedia | null;

    // If a fetch is already in-flight for this page, reuse it
    const inflight = heroFetchInFlight.current.get(pageKey);
    if (inflight) return inflight;

    // Respect cooldown after recent error
    const lastErrAt = heroFetchLastErrorAt.current.get(pageKey) || 0;
    if (Date.now() - lastErrAt < HERO_FETCH_COOLDOWN_MS) {
      return existing ?? null;
    }

    const p = (async () => {
      try {
        const { data, error } = await supabase
          .from('hero_media')
          .select('*')
          .eq('page_key', pageKey)
          .maybeSingle();
        if (error) {
          const rawMsg = (error as any)?.message || (error as any)?.toString?.() || '';
          // Throttle log to warning and mark cooldown
          heroFetchLastErrorAt.current.set(pageKey, Date.now());
          console.warn(`[Data] fetchHeroMedia(${pageKey}) non-critical error:`, rawMsg);
          // Cache null to avoid repeated attempts in components
          setHeroMedia((prev) => ({ ...prev, [pageKey]: null }));
          return null;
        }
        if (data) {
          const patched = {
            ...data,
            image_url: sanitizeUrl((data as any).image_url),
            mobile_image_url: sanitizeUrl((data as any).mobile_image_url),
            video_url: sanitizeUrl((data as any).video_url),
            mobile_video_url: sanitizeUrl((data as any).mobile_video_url),
            mobile_poster_url: sanitizeUrl((data as any).mobile_poster_url),
            desktop_zoom: (data as any).desktop_zoom ?? 1,
            desktop_offset_x: (data as any).desktop_offset_x ?? 0,
            desktop_offset_y: (data as any).desktop_offset_y ?? 0,
            mobile_zoom: (data as any).mobile_zoom ?? 1,
            mobile_offset_x: (data as any).mobile_offset_x ?? 0,
            mobile_offset_y: (data as any).mobile_offset_y ?? 0,
          } as HeroMedia;
          setHeroMedia((prev) => {
            const next = { ...prev, [pageKey]: patched };
            return next;
          });
          return patched;
        }
        // No row present: cache null to avoid tight refetch loops
        setHeroMedia((prev) => {
          const next = { ...prev, [pageKey]: null };
          return next;
        });
        return null;
      } finally {
        // Clear single-flight marker when complete
        heroFetchInFlight.current.delete(pageKey);
      }
    })();

    heroFetchInFlight.current.set(pageKey, p);
    return p;
  };

  const updateHeroMedia = async (pageKey: PageKey, patch: Partial<HeroMedia>) => {
    // Allow creating or updating in a single call (first-save fix)
    const payload = { ...patch } as Partial<HeroMedia>;
    delete (payload as any).page_key;
    try {
      if (typeof window !== 'undefined') {
        // Lightweight debug trace to verify outgoing framing values
        console.debug('[updateHeroMedia] outgoing', pageKey, {
          mobile_zoom: (payload as any).mobile_zoom,
          mobile_offset_x: (payload as any).mobile_offset_x,
          mobile_offset_y: (payload as any).mobile_offset_y,
          desktop_zoom: (payload as any).desktop_zoom,
          desktop_offset_x: (payload as any).desktop_offset_x,
          desktop_offset_y: (payload as any).desktop_offset_y,
        });
      }
    } catch {}
    const prev = heroMedia[pageKey] || null;
    let { data: rows, error } = await supabase
      .from('hero_media')
      .upsert([{ page_key: pageKey, ...payload }], { onConflict: 'page_key' })
      .select();
    // Fallback if remote schema missing new columns
    if (error && (error.message || '').toLowerCase().includes('column') && ((error.message.includes('mobile_video_url')) || (error.message.includes('mobile_poster_url')) || (error.message.includes('mobile_image_url')))) {
      console.warn('[Data:updateHeroMedia] Remote schema missing mobile columns, retrying without them. Run migration to add mobile_image_url/mobile_video_url/mobile_poster_url.');
      const fallback = { ...payload } as any;
      delete fallback.mobile_video_url;
      delete fallback.mobile_poster_url;
      delete fallback.mobile_image_url;
      const retry = await supabase
        .from('hero_media')
        .upsert([{ page_key: pageKey, ...fallback }], { onConflict: 'page_key' })
        .select();
      if (retry.error) throw retry.error;
      rows = retry.data;
      error = null as any;
    }
    if (error) throw error;
    const updated = rows?.[0] as HeroMedia | undefined;
    // Cleanup old assets only when replacing existing row
    if (prev) {
      if (payload.image_url && !urlsEqual(prev.image_url, payload.image_url)) {
        if (!isUrlReferencedSomewhere(prev.image_url, { table: 'hero_media', id: String(pageKey) })) {
          deleteStorageFileByPublicUrl(prev.image_url);
        }
      }
      if ((payload as any).mobile_image_url && !urlsEqual((prev as any).mobile_image_url, (payload as any).mobile_image_url)) {
        const oldMobileImg = (prev as any).mobile_image_url;
        if (oldMobileImg && !isUrlReferencedSomewhere(oldMobileImg, { table: 'hero_media', id: String(pageKey) })) {
          deleteStorageFileByPublicUrl(oldMobileImg);
        }
      }
      if (payload.video_url && !urlsEqual(prev.video_url, payload.video_url)) {
        if (!isUrlReferencedSomewhere(prev.video_url, { table: 'hero_media', id: String(pageKey) })) {
          deleteStorageFileByPublicUrl(prev.video_url);
        }
      }
      if ((payload as any).mobile_video_url && !urlsEqual((prev as any).mobile_video_url, (payload as any).mobile_video_url)) {
        const oldMobile = (prev as any).mobile_video_url;
        if (oldMobile && !isUrlReferencedSomewhere(oldMobile, { table: 'hero_media', id: String(pageKey) })) {
          deleteStorageFileByPublicUrl(oldMobile);
        }
      }
      if ((payload as any).mobile_poster_url && !urlsEqual((prev as any).mobile_poster_url, (payload as any).mobile_poster_url)) {
        const oldMobilePoster = (prev as any).mobile_poster_url;
        if (oldMobilePoster && !isUrlReferencedSomewhere(oldMobilePoster, { table: 'hero_media', id: String(pageKey) })) {
          deleteStorageFileByPublicUrl(oldMobilePoster);
        }
      }
    }
    if (updated) {
      const patched = {
        ...updated,
  image_url: sanitizeUrl((updated as any).image_url),
  mobile_image_url: sanitizeUrl((updated as any).mobile_image_url),
        video_url: sanitizeUrl((updated as any).video_url),
        mobile_video_url: sanitizeUrl((updated as any).mobile_video_url),
        mobile_poster_url: sanitizeUrl((updated as any).mobile_poster_url),
        desktop_zoom: (updated as any).desktop_zoom ?? 1,
        desktop_offset_x: (updated as any).desktop_offset_x ?? 0,
        desktop_offset_y: (updated as any).desktop_offset_y ?? 0,
        mobile_zoom: (updated as any).mobile_zoom ?? 1,
        mobile_offset_x: (updated as any).mobile_offset_x ?? 0,
        mobile_offset_y: (updated as any).mobile_offset_y ?? 0,
      } as HeroMedia;
      try {
        if (typeof window !== 'undefined') {
          const pAny: any = patched;
          console.debug('[updateHeroMedia] returned row', pageKey, {
            mobile_zoom: pAny.mobile_zoom,
            mobile_offset_x: pAny.mobile_offset_x,
            mobile_offset_y: pAny.mobile_offset_y,
            desktop_zoom: pAny.desktop_zoom,
            desktop_offset_x: pAny.desktop_offset_x,
            desktop_offset_y: pAny.desktop_offset_y,
          });
        }
      } catch {}
      setHeroMedia((prevMap) => {
        const next = { ...prevMap, [pageKey]: patched };
        return next;
      });
    } else {
      // Fallback: refetch if select somehow returned empty
      await fetchHeroMedia(pageKey);
    }
  };

  useEffect(() => {
    // Initial bootstrap should show loading state
    // Kick off fetching hero media for the homepage as early as possible so
    // the hero video URL is available quickly (helps autoplay start sooner).
    // Fire-and-forget; fetchHeroMedia will cache the result and is single-flight.
    try { fetchHeroMedia('home').catch(() => {}); } catch {}
    fetchData(false);

    // Safety valve: if data fetching hangs for > 15s, force loading off so user isn't stuck
    const safety = setTimeout(() => {
      setLoading((l) => {
        if (l) {
          console.warn('[Data] fetchData timed out or hung; forcing loading=false');
          return false;
        }
        return l;
      });
    }, 15000);
    
    return () => clearTimeout(safety);
  }, []);

  // Refetch after authentication changes (e.g., RLS allows more rows when logged in)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Auth refreshes should be silent to avoid UI resets
      fetchData(true);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // Auto-retry when connection is offline/degraded
  useEffect(() => {
    if (connectionStatus === 'ok') {
      clearRetryTimer();
      retryAttemptRef.current = 0;
      return;
    }
    // If degraded or offline, schedule exponential backoff retry
    scheduleRetry();
    return () => clearRetryTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  // Listen to browser online/offline and visibility changes to opportunistically refetch
  useEffect(() => {
    const onOnline = () => {
      fetchData(true);
    };
    const onOffline = () => {
      setConnectionStatus('offline');
      setLastError('Browser offline');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const age = Date.now() - lastFetchAtRef.current;
        if (connectionStatus !== 'ok' || age > 60_000) {
          fetchData(true);
        }
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  // Realtime subscription for roadmap milestones so roadmap updates instantly
  useEffect(() => {
    const channelName = 'ctx-roadmap-milestones';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_milestones' }, (payload: any) => {
        setRoadmapMilestones(cur => {
          const row = (payload.new || payload.old) as RoadmapMilestone;
          if (payload.eventType === 'INSERT') {
            if (cur.find(r => r.id === row.id)) return cur; // avoid dup
            return [...cur, row].sort((a,b) => a.order_position - b.order_position);
          }
          if (payload.eventType === 'UPDATE') {
            return cur.map(r => r.id === row.id ? { ...r, ...row } : r).sort((a,b) => a.order_position - b.order_position);
          }
          if (payload.eventType === 'DELETE') {
            return cur.filter(r => r.id !== row.id).sort((a,b) => a.order_position - b.order_position);
          }
          return cur;
        });
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) roadmap_milestones`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Realtime subscription for hero_media so hero background framing updates propagate across tabs
  useEffect(() => {
    const channelName = 'ctx-hero-media';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_media' }, (payload: any) => {
        try {
          const row = (payload.new || payload.old);
          if (!row?.page_key) return;
          if (payload.eventType === 'DELETE') {
            setHeroMedia(prev => {
              const next = { ...prev } as any; delete next[row.page_key]; return next;
            });
            return;
          }
          const patched: HeroMedia = {
            ...(row as any),
            image_url: sanitizeUrl((row as any).image_url),
            video_url: sanitizeUrl((row as any).video_url),
            mobile_video_url: sanitizeUrl((row as any).mobile_video_url),
            mobile_poster_url: sanitizeUrl((row as any).mobile_poster_url),
            desktop_zoom: (row as any).desktop_zoom ?? 1,
            desktop_offset_x: (row as any).desktop_offset_x ?? 0,
            desktop_offset_y: (row as any).desktop_offset_y ?? 0,
            mobile_zoom: (row as any).mobile_zoom ?? 1,
            mobile_offset_x: (row as any).mobile_offset_x ?? 0,
            mobile_offset_y: (row as any).mobile_offset_y ?? 0,
          } as HeroMedia;
          setHeroMedia(prev => ({ ...prev, [row.page_key]: patched }));
        } catch (e) {
          console.warn('[DataContext] hero_media realtime handling error', e);
        }
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) hero_media`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Realtime: keep registrations list in sync (insert/update/delete)
  useEffect(() => {
    const channelName = 'ctx-registrations';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, (payload: any) => {
        setRegistrations((cur) => {
          const row = (payload.new || payload.old) as Registration;
          if (payload.eventType === 'INSERT') {
            if (cur.find((r) => r.id === row.id)) return cur; // avoid dup
            return [row, ...cur];
          }
          if (payload.eventType === 'UPDATE') {
            return cur.map((r) => (r.id === row.id ? { ...r, ...row } : r));
          }
          if (payload.eventType === 'DELETE') {
            return cur.filter((r) => r.id !== row.id);
          }
          return cur;
        });
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) registrations`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Realtime: admin_users updates
  useEffect(() => {
    const channelName = 'ctx-admin-users';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_users' }, async (_payload: any) => {
        // Refresh list on any change; small table
        try { await refreshAdminUsers(); } catch {}
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) admin_users`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Realtime: keep sponsors in sync so add/update/delete reflects instantly across Admin and public pages
  useEffect(() => {
    const channelName = 'ctx-sponsors';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, (payload: any) => {
        setSponsors((cur) => {
          const row = (payload.new || payload.old) as Sponsor;
          if (payload.eventType === 'INSERT') {
            if (cur.find((s) => s.id === row.id)) return cur; // avoid dup
            return [...cur, row].sort((a: any, b: any) => (a.order_position ?? 0) - (b.order_position ?? 0));
          }
          if (payload.eventType === 'UPDATE') {
            return cur
              .map((s) => (s.id === row.id ? { ...s, ...row } : s))
              .sort((a: any, b: any) => (a.order_position ?? 0) - (b.order_position ?? 0));
          }
          if (payload.eventType === 'DELETE') {
            return cur.filter((s) => s.id !== row.id).sort((a: any, b: any) => (a.order_position ?? 0) - (b.order_position ?? 0));
          }
          return cur;
        });
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) sponsors`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Realtime: keep sponsorship packages in sync so category chips and grouping update immediately
  useEffect(() => {
    const channelName = 'ctx-sponsorship-packages';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsorship_packages' }, (payload: any) => {
        setSponsorshipPackages((cur) => {
          const row = (payload.new || payload.old) as SponsorshipPackage;
          if (payload.eventType === 'INSERT') {
            if (cur.find((p) => p.id === row.id)) return cur;
            return [...cur, row].sort((a, b) => a.order_position - b.order_position);
          }
          if (payload.eventType === 'UPDATE') {
            return cur
              .map((p) => (p.id === row.id ? { ...p, ...row } : p))
              .sort((a, b) => a.order_position - b.order_position);
          }
          if (payload.eventType === 'DELETE') {
            return cur.filter((p) => p.id !== row.id).sort((a, b) => a.order_position - b.order_position);
          }
          return cur;
        });
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [channelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) sponsorship_packages`);
        }
      });
    try { realtimeChannelsRef.current.add(channel); } catch {}
    return () => { try { supabase.removeChannel(channel); realtimeChannelsRef.current.delete(channel); } catch {} };
  }, []);

  // Realtime: keep form_settings in sync so enable/disable reflects instantly
  useEffect(() => {
    const formChannelName = 'ctx-form-settings';
    const formChannel = supabase
      .channel(formChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<FormSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') setFormSettings(null);
          else if (payload.new) setFormSettings(payload.new as FormSettings);
        }
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [formChannelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) form_settings`);
        }
      });

    const homepageChannelName = 'ctx-homepage-settings';
    const homepageChannel = supabase
      .channel(homepageChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<HomepageSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') {
            setHomepageSettings(null);
          }
          else if (payload.new) {
            setHomepageSettings(payload.new as HomepageSettings);
          }
        }
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [homepageChannelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) homepage_settings`);
        }
      });

    const homeboundChannelName = 'ctx-homebound-settings';
    const homeboundChannel = supabase
      .channel(homeboundChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homebound_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<HomeboundSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') setHomeboundSettings(null);
          else if (payload.new) setHomeboundSettings(payload.new as HomeboundSettings);
        }
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [homeboundChannelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) homebound_settings`);
        }
      });

    const siteSettingsChannelName = 'ctx-site-settings';
    const siteSettingsChannel = supabase
      .channel(siteSettingsChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<SiteSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') setSiteSettings(null);
          else if (payload.new) setSiteSettings(payload.new as SiteSettings);
        }
      })
      .subscribe((status: any) => {
        const s = String(status);
        setRealtimeStatus((prev) => ({ ...prev, [siteSettingsChannelName]: s }));
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          scheduleResubscribe(`Realtime(${s}) site_settings`);
        }
      });

    try {
      realtimeChannelsRef.current.add(formChannel);
      realtimeChannelsRef.current.add(homepageChannel);
      realtimeChannelsRef.current.add(homeboundChannel);
      realtimeChannelsRef.current.add(siteSettingsChannel);
    } catch {}
    return () => {
      try { supabase.removeChannel(formChannel); realtimeChannelsRef.current.delete(formChannel); } catch {}
      try { supabase.removeChannel(homepageChannel); realtimeChannelsRef.current.delete(homepageChannel); } catch {}
      try { supabase.removeChannel(homeboundChannel); realtimeChannelsRef.current.delete(homeboundChannel); } catch {}
      try { supabase.removeChannel(siteSettingsChannel); realtimeChannelsRef.current.delete(siteSettingsChannel); } catch {}
    };
  }, []);

  // Event Management
  const addEvent = async (event: Partial<Event>) => {
    // Try with provided payload first
    let { error } = await supabase.from('events').insert(event);
    if (error) {
      const msg = ((error as any)?.message || '').toLowerCase() + ' ' + (((error as any)?.details) || '').toLowerCase();
      if (msg.includes('registration_opens_at') || msg.includes('registration_timer_enabled') || msg.includes('watch_live_url') || msg.includes('schema cache') || msg.includes('team_max_members')) {
        // Backend likely hasn't been migrated yet; strip newer fields and retry once
        timersSupportedRef.current = false;
        const safe: any = { ...event };
        delete safe.registration_opens_at;
        delete safe.registration_timer_enabled;
        delete safe.watch_live_url;
        // Also strip registration photo feature fields if schema not yet migrated
        delete safe.registration_photo_required;
        delete safe.registration_photo_label;
        // Strip winners display mode if not present in schema
  delete safe.winners_display_mode;
  // Strip motion poster autoplay flag if schema doesn't support it yet
  delete safe.motion_poster_autoplay;
  delete safe.owner_hover_reveal;
        // Strip per-event team cap if schema cache hasn’t picked it up yet
        delete safe.team_max_members;
        const retry = await supabase.from('events').insert(safe);
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
    }
    await fetchData(true);
  };

  const addEventWithCoordinators = async (
    event: Partial<Event>,
    coordinators: Array<{ name: string; phone?: string | null }>
  ) => {
    // Insert event and get the id back so we can link coordinators
    let { data: inserted, error } = await supabase
      .from('events')
      .insert(event)
      .select('id')
      .single();
    if (error) {
      const msg = ((error as any)?.message || '').toLowerCase() + ' ' + (((error as any)?.details) || '').toLowerCase();
      if (msg.includes('registration_opens_at') || msg.includes('registration_timer_enabled') || msg.includes('watch_live_url') || msg.includes('schema cache') || msg.includes('winners_display_mode') || msg.includes('team_max_members') || msg.includes('registration_participant_quotas')) {
        timersSupportedRef.current = false;
        const safe: any = { ...event };
        delete safe.registration_opens_at;
        delete safe.registration_timer_enabled;
        delete safe.watch_live_url;
        delete safe.registration_photo_required;
        delete safe.registration_photo_label;
  delete safe.winners_display_mode;
  delete safe.motion_poster_autoplay;
  delete safe.owner_hover_reveal;
        // Strip per-event team cap if schema cache hasn’t picked it up yet
        delete safe.team_max_members;
        // Strip per-event participant quotas if schema cache hasn’t picked it up yet
        delete safe.registration_participant_quotas;
        const retry = await supabase
          .from('events')
          .insert(safe)
          .select('id')
          .single();
        if (retry.error) throw retry.error;
        inserted = retry.data as any;
      } else {
        throw error;
      }
    }
    const newId = inserted?.id as number;
    if (newId && coordinators && coordinators.length > 0) {
      // Prepare coordinator rows with order
      const rows = coordinators.map((c, idx) => ({
        event_id: newId,
        name: (c.name || '').trim() || '—',
        phone: (c.phone ?? null) as string | null,
        order_position: idx + 1,
      }));
      // Best-effort insert; if this fails we still keep the event
      const { error: ecErr } = await supabase.from('event_coordinators').insert(rows as any);
      if (ecErr) {
        console.error('Failed to insert event coordinators for new event', ecErr);
      }
    }
    await fetchData(true);
  };

  const updateEvent = async (id: number, event: Partial<Event>) => {
    const prev = events.find(e => e.id === id) || null;
    let { error } = await supabase.from('events').update(event).eq('id', id);
    if (error) {
      const msg = ((error as any)?.message || '').toLowerCase() + ' ' + (((error as any)?.details) || '').toLowerCase();
      if (msg.includes('registration_opens_at') || msg.includes('registration_timer_enabled') || msg.includes('watch_live_url') || msg.includes('schema cache') || msg.includes('winners_display_mode') || msg.includes('prefer_video') || msg.includes('team_max_members') || msg.includes('registration_participant_quotas')) {
        timersSupportedRef.current = false;
        const safe: any = { ...event };
        delete safe.registration_opens_at;
        delete safe.registration_timer_enabled;
        delete safe.watch_live_url;
        delete safe.registration_photo_required;
        delete safe.registration_photo_label;
        delete safe.winners_display_mode;
        // If database hasn't had prefer_video migration applied yet, remove it before retrying.
        delete safe.prefer_video;
  delete safe.motion_poster_autoplay;
  delete safe.owner_hover_reveal;
        // Strip per-event team cap if schema cache hasn’t picked it up yet
        delete safe.team_max_members;
        // Strip per-event participant quotas if schema cache hasn’t picked it up yet
        delete safe.registration_participant_quotas;
        const retry = await supabase.from('events').update(safe).eq('id', id);
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
    }
    // Clean up replaced assets (image, motion poster)
    if (prev) {
      const newImg = (event as any)?.image;
      const newMotion = (event as any)?.motion_poster_url;
      const oldImg = (prev as any)?.image;
      const oldMotion = (prev as any)?.motion_poster_url;
      const toDelete: string[] = [];
      if (newImg && !urlsEqual(oldImg, newImg)) toDelete.push(oldImg);
      if (newMotion && !urlsEqual(oldMotion, newMotion)) toDelete.push(oldMotion);
      for (const u of toDelete.filter(Boolean)) {
        if (!isUrlReferencedSomewhere(u, { table: 'events', id })) {
          deleteStorageFileByPublicUrl(u);
        }
      }
    }
    await fetchData(true);
  };

  // Batch reorder events (drag & drop UI). orderedIds is the new top-to-bottom list.
const reorderEvents = async (orderedIds: number[]): Promise<boolean> => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return false;
  setLastEventReorderError(null);
    // If current in-memory events lack the display_order property entirely, abort with guidance
    if (events.length && !Object.prototype.hasOwnProperty.call(events[0] as any, 'display_order')) {
      const msg = "display_order column not present in fetched events (migration not applied or API cache stale)";
      console.warn('[reorderEvents] aborting:', msg);
      setLastEventReorderError({ phase: 'precheck', message: msg, details: 'Apply migration & Reset API cache in Supabase Dashboard > Database > Settings', hint: 'Run ALTER TABLE and then Reset cache' });
      return false;
    }
    // Sanitize + validate ids (must be distinct positive integers)
    const seen = new Set<number>();
    const cleanIds: number[] = [];
    for (const raw of orderedIds) {
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) {
        console.warn('[reorderEvents] skipping invalid id value', raw);
        continue;
      }
      if (seen.has(n)) continue;
      seen.add(n);
      cleanIds.push(n);
    }
    if (!cleanIds.length) {
      console.warn('[reorderEvents] no valid ids after validation');
      return false;
    }
    // Preflight: ensure every id still exists in current in-memory set (avoids upserts attempting insert for deleted rows)
    const existingIdSet = new Set(events.map(e => e.id));
    const missingIds = cleanIds.filter(id => !existingIdSet.has(id));
    let effectiveIds = cleanIds.filter(id => existingIdSet.has(id));
    if (missingIds.length) {
      const msg = `Some reordered event ids no longer exist: [${missingIds.join(', ')}] (likely deleted or from stale UI state)`;
      console.warn('[reorderEvents] missing ids, will skip them', missingIds);
      setLastEventReorderError({ phase: 'preflight-missing', message: msg, details: 'Skipped missing ids; remaining events will still be ordered.', hint: 'Refresh the page if many are missing.' });
    }
    if (!effectiveIds.length) {
      console.warn('[reorderEvents] no remaining existing ids after filtering');
      return false;
    }
    // Optimistic local ordering
    setEvents(prev => {
      const byId = new Map(prev.map(e => [e.id, e] as const));
      const ordered: Event[] = [];
      effectiveIds.forEach((id, idx) => {
        const row = byId.get(id);
        if (row) ordered.push({ ...row, display_order: idx + 1 } as any);
      });
      // Append any events not included (safety) preserving their existing order after the ordered list
      prev.forEach(e => { if (!effectiveIds.includes(e.id)) ordered.push(e); });
      return ordered;
    });
    try {
      const updates = effectiveIds.map((id, idx) => ({ id, display_order: idx + 1 }));
      console.debug('[reorderEvents] applying per-row updates (no bulk upsert)', updates);
      const failed: { id: number; message: string }[] = [];
      for (const u of updates) {
        try {
          const { error: rowErr, data: rowData } = await supabase
            .from('events')
            .update({ display_order: u.display_order })
            .eq('id', u.id)
            .select('id,display_order,title')
            .maybeSingle();
          if (rowErr) {
            failed.push({ id: u.id, message: rowErr.message });
            console.warn('[reorderEvents] row update failed', u.id, rowErr.message, rowErr.details, rowErr.hint);
          } else if (!rowData) {
            failed.push({ id: u.id, message: 'No row returned' });
            console.warn('[reorderEvents] row update returned no data', u.id);
          }
        } catch (th) {
          failed.push({ id: u.id, message: (th as any)?.message || String(th) });
          console.warn('[reorderEvents] row update threw', u.id, th);
        }
      }
      if (failed.length) {
        setLastEventReorderError({
          phase: 'row-updates',
          message: `Failed ${failed.length} of ${updates.length} updates`,
          details: failed.map(f => `${f.id}:${f.message}`).join('; '),
          hint: failed.some(f => /null value/.test(f.message)) ? 'Check NOT NULL columns and ensure we are only updating existing rows.' : undefined,
        });
        // Refresh to ensure consistency
        await fetchData(true);
        return failed.length < updates.length; // partial success
      }
      return true;
    } catch (e) {
      console.warn('[reorderEvents] threw, refetching', e);
      setLastEventReorderError({ phase: 'throw', message: (e as any)?.message || String(e) });
      await fetchData(true);
      return false;
    }
  };

  const deleteEvent = async (id: number) => {
    const prev = events.find(e => e.id === id) || null;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    // Attempt storage cleanup for associated assets
    if (prev) {
      deleteStorageFileByPublicUrl((prev as any)?.image);
      deleteStorageFileByPublicUrl((prev as any)?.motion_poster_url);
    }
    await fetchData(true);
  };
    // Batch reorder event categories (drag & drop UI). orderedIds is the new top-to-bottom list.
    const reorderEventCategories = async (orderedIds: number[]): Promise<boolean> => {
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) return false;
      // If current in-memory eventCategories lack the order_position property entirely, abort with guidance
      if (eventCategories.length && !Object.prototype.hasOwnProperty.call(eventCategories[0] as any, 'order_position')) {
        const msg = "order_position column not present in fetched event_categories (migration not applied or API cache stale)";
        console.warn('[reorderEventCategories] aborting:', msg);
        return false;
      }

      // Sanitize + validate ids (must be distinct positive integers)
      const seen = new Set<number>();
      const cleanIds: number[] = [];
      for (const raw of orderedIds) {
        const n = Number(raw);
        if (!Number.isInteger(n) || n <= 0) {
          console.warn('[reorderEventCategories] skipping invalid id value', raw);
          continue;
        }
        if (seen.has(n)) continue;
        seen.add(n);
        cleanIds.push(n);
      }
      if (!cleanIds.length) {
        console.warn('[reorderEventCategories] no valid ids after validation');
        return false;
      }

      // Preflight: ensure every id still exists in current in-memory set
      const existingIdSet = new Set(eventCategories.map(c => c.id));
      const missingIds = cleanIds.filter(id => !existingIdSet.has(id));
      let effectiveIds = cleanIds.filter(id => existingIdSet.has(id));
      if (missingIds.length) {
        console.warn('[reorderEventCategories] missing ids, will skip them', missingIds);
      }
      if (!effectiveIds.length) {
        console.warn('[reorderEventCategories] no remaining existing ids after filtering');
        return false;
      }

      // Optimistic local ordering
      setEventCategories(prev => {
        const byId = new Map(prev.map(c => [c.id, c] as const));
        const ordered: EventCategory[] = [];
        effectiveIds.forEach((id, idx) => {
          const row = byId.get(id);
          if (row) ordered.push({ ...row, order_position: idx + 1 } as any);
        });
        // Append any categories not included preserving existing order after the ordered list
        prev.forEach(c => { if (!effectiveIds.includes(c.id)) ordered.push(c); });
        return ordered;
      });

      try {
        // Prefer an atomic server-side RPC for bulk ordering when available.
        try {
          const { error: rpcErr } = await supabase.rpc('reorder_event_categories', { p_ids: effectiveIds });
          if (!rpcErr) {
            await fetchData(true);
            return true;
          }
          console.warn('[reorderEventCategories] RPC call failed, falling back to per-row updates', rpcErr.message, rpcErr.details, rpcErr.hint);
        } catch (rpcTh) {
          console.warn('[reorderEventCategories] RPC call threw, falling back to per-row updates', rpcTh);
        }

        // Fallback: apply per-row updates (best-effort)
        const updates = effectiveIds.map((id, idx) => ({ id, order_position: idx + 1 }));
        const failed: { id: number; message: string }[] = [];
        for (const u of updates) {
          try {
            const { error: rowErr, data: rowData } = await supabase
              .from('event_categories')
              .update({ order_position: u.order_position })
              .eq('id', u.id)
              .select('id,order_position,name')
              .maybeSingle();
            if (rowErr) {
              failed.push({ id: u.id, message: rowErr.message });
              console.warn('[reorderEventCategories] row update failed', u.id, rowErr.message, rowErr.details, rowErr.hint);
            } else if (!rowData) {
              failed.push({ id: u.id, message: 'No row returned' });
              console.warn('[reorderEventCategories] row update returned no data', u.id);
            }
          } catch (th) {
            failed.push({ id: u.id, message: (th as any)?.message || String(th) });
            console.warn('[reorderEventCategories] row update threw', u.id, th);
          }
        }
        if (failed.length) {
          console.warn('[reorderEventCategories] some updates failed', failed.length, failed.slice(0,3));
          await fetchData(true);
          return false;
        }
        await fetchData(true);
        return true;
      } catch (err) {
        console.error('[reorderEventCategories] failed', err);
        return false;
      }
    };

    // Event Winners CRUD (optional table)
  const addEventWinner = async (winner: { event_id?: number | null; category?: string | null; position?: number; name: string; year?: string | null; photo_url?: string | null; registration_id?: string | null }) => {
    // Ensure category defaults to the event's category when not explicitly provided
    const payload = { ...winner } as any;
    if (!payload.category && payload.event_id) {
      const ev = events.find(e => e.id === payload.event_id);
      if (ev) payload.category = ev.category || null;
    }
    // Only include DB columns
    const allowedKeys = new Set(['event_id','category','registration_id','position','name','photo_url','year']);
    const sanitized = Object.fromEntries(Object.entries(payload).filter(([k]) => allowedKeys.has(k)));
    let { error } = await supabase.from('event_winners').insert(sanitized as any);
    if (error) {
      const msg = (error as any)?.message || '';
      const lower = String(msg).toLowerCase();
      if (lower.includes('column') && lower.includes('year') && lower.includes('does not exist')) {
        // Column not present yet — retry without 'year'
        const { year, ...fallback } = payload;
        const retry = await supabase.from('event_winners').insert(fallback as any);
        if (retry.error) {
          throw retry.error;
        }
        await fetchData(true);
        return;
      }
      if (lower.includes('relation') || lower.includes('does not exist')) {
        // table missing; ignore
        console.warn('event_winners table likely missing; cannot add winner yet');
        return;
      }
      throw error;
    }
    await fetchData(true);
  };

  const updateEventWinner = async (id: number, patch: Partial<any>) => {
    // Only include DB columns and strip client-only/computed fields
    const allowedKeys = new Set(['event_id','category','registration_id','position','name','photo_url','year']);
    const sanitized = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => allowedKeys.has(k)));
    let { error } = await supabase.from('event_winners').update(sanitized).eq('id', id);
    if (error) {
      const msg = (error as any)?.message || '';
      const lower = String(msg).toLowerCase();
      if (lower.includes('column') && lower.includes('year') && lower.includes('does not exist')) {
        // Retry without the 'year' key
        const { year, ...fallback } = (patch || {}) as any;
        const retry = await supabase.from('event_winners').update(fallback).eq('id', id);
        if (retry.error) {
          throw retry.error;
        }
        await fetchData(true);
        return;
      }
      if (lower.includes('relation') || lower.includes('does not exist')) {
        console.warn('event_winners table likely missing; cannot update winner');
        return;
      }
      throw error;
    }
    await fetchData(true);
  };

  const deleteEventWinner = async (id: number) => {
    const { error } = await supabase.from('event_winners').delete().eq('id', id);
    if (error) {
      const msg = (error as any)?.message || '';
      const lower = String(msg).toLowerCase();
      if (lower.includes('relation') || lower.includes('does not exist')) {
        console.warn('event_winners table likely missing; cannot delete winner');
        return;
      }
      throw error;
    }
    await fetchData(true);
  };

  // Notifications CRUD (owner/admin only; optional table)
  const addNotification = async (n: { title?: string | null; message: string; type?: string; link_url?: string | null; visible?: boolean; starts_at?: string | null; ends_at?: string | null; priority?: number; admin_only?: boolean; auto_dismiss_seconds?: number | null; text_color?: string | null; glow_color?: string | null }) => {
    const payload = {
      title: n.title ?? null,
      message: n.message,
      type: n.type ?? 'info',
      link_url: n.link_url ?? null,
      visible: n.visible ?? true,
      starts_at: n.starts_at ?? new Date().toISOString(),
      ends_at: n.ends_at ?? null,
      priority: typeof n.priority === 'number' ? n.priority : 0,
      admin_only: !!(n as any).admin_only,
      auto_dismiss_seconds: (typeof n.auto_dismiss_seconds === 'number' ? n.auto_dismiss_seconds : null) as number | null,
      text_color: n.text_color ?? null,
      glow_color: n.glow_color ?? null,
    } as any;
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) {
      const lower = String((error as any)?.message || '').toLowerCase();
      if (lower.includes('relation') && lower.includes('does not exist')) {
        console.warn('notifications table likely missing; cannot add');
        return;
      }
      // If admin_only column doesn't exist yet, try again without it
      if (String((error as any)?.message || '').toLowerCase().includes('column') && String((error as any)?.message || '').toLowerCase().includes('admin_only')) {
        try {
          const fallback = { ...payload };
          delete fallback.admin_only;
          const { error: e2 } = await supabase.from('notifications').insert(fallback);
          if (e2) throw e2;
          await fetchData(true);
          return;
        } catch (e) {
          // fall through to throw below
        }
      }
      throw error;
    }
    await fetchData(true);
  };

  const updateNotification = async (id: number, patch: Partial<any>) => {
  const allowed = new Set(['title','message','type','link_url','visible','starts_at','ends_at','priority','admin_only','auto_dismiss_seconds','text_color','glow_color']);
    const sanitized = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => allowed.has(k)));
    const { error } = await supabase.from('notifications').update(sanitized).eq('id', id);
    if (error) {
      const lower = String((error as any)?.message || '').toLowerCase();
      if (lower.includes('relation') && lower.includes('does not exist')) {
        console.warn('notifications table likely missing; cannot update');
        return;
      }
      // If admin_only column missing, retry without it
      if (lower.includes('column') && lower.includes('admin_only')) {
        const { admin_only, ...rest } = sanitized as any;
        const { error: e2 } = await supabase.from('notifications').update(rest).eq('id', id);
        if (!e2) { await fetchData(true); return; }
      }
      throw error;
    }
    await fetchData(true);
  };

  const deleteNotification = async (id: number) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      const lower = String((error as any)?.message || '').toLowerCase();
      if (lower.includes('relation') && lower.includes('does not exist')) {
        console.warn('notifications table likely missing; cannot delete');
        return;
      }
      throw error;
    }
    await fetchData(true);
  };

  // Lightweight refresh of active, viewer-visible notifications only
  const refreshNotifications = React.useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      // Determine if current user is admin so we can include admin_only notifications
      let isAdminUser = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid && Array.isArray(adminUsers)) {
          isAdminUser = !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
        }
      } catch {}

      // Build base query
      let query: any = supabase.from('notifications' as any).select('*').eq('visible', true).lte('starts_at', nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`).order('priority', { ascending: false }).order('created_at', { ascending: false });

      if (!isAdminUser) {
        // Only fetch public notifications for non-admins. If column missing, fallback to querying without this filter.
        try {
          const { data, error } = await query.eq('admin_only', false);
          if (!error && Array.isArray(data)) { setNotifications(data); console.debug('[DataContext] refreshNotifications fetched (public filter)', data); return; }
          if (error) throw error;
        } catch (e: any) {
          const lower = String((e as any)?.message || '').toLowerCase();
          if (lower.includes('column') && lower.includes('admin_only')) {
            // Column absent; fall back to querying all visible notifications
            try {
              const { data: d2, error: e2 } = await supabase.from('notifications' as any).select('*').eq('visible', true).lte('starts_at', nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`).order('priority', { ascending: false }).order('created_at', { ascending: false });
              if (!e2 && Array.isArray(d2)) { setNotifications(d2); console.debug('[DataContext] refreshNotifications fetched (fallback no admin_only)', d2); }
            } catch {}
          }
        }
      } else {
        // Admin: fetch all visible notifications including admin_only
        try {
          const { data, error } = await query;
          if (!error && Array.isArray(data)) { setNotifications(data); console.debug('[DataContext] refreshNotifications fetched (admin)', data); }
        } catch {}
      }
    } catch {}
  }, [adminUsers]);

  // Realtime subscription for notifications so viewers see updates instantly
  React.useEffect(() => {
    try {
      console.debug('[DataContext] subscribing to realtime:notifications');
      const channel = supabase
        .channel('realtime:notifications')
        .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notifications' } as any, (payload: any) => {
          console.debug('[DataContext] realtime notification event', payload?.event, payload?.record?.id);
          refreshNotifications().catch(() => {});
        })
        .subscribe((status: any) => {
          console.debug('[DataContext] realtime subscription status', status);
          setRealtimeStatus((prev) => ({ ...prev, notifications: String(status) }));
        });
      realtimeChannelsRef.current.add(channel);
      setRealtimeStatus((prev) => ({ ...prev, notifications: 'SUBSCRIBED' }));
      return () => {
        try { supabase.removeChannel(channel); } catch {}
        realtimeChannelsRef.current.delete(channel);
      };
    } catch (e) {
      console.warn('[DataContext] realtime subscribe failed', e);
    }
  }, [refreshNotifications]);

  // Periodic polling to catch scheduled start/end boundaries without requiring user refresh
  React.useEffect(() => {
    const id = setInterval(() => {
      refreshNotifications().catch(() => {});
    }, 10_000); // 10s cadence for responsive schedule changes
    return () => clearInterval(id);
  }, [refreshNotifications]);

  // --- Utility: Delete a file from Supabase Storage when given a public URL
  // Tracks objects already attempted this session to avoid duplicate removal if multiple rows used same image
  const removedObjectsRef = React.useRef<Set<string>>(new Set());
  const KNOWN_BUCKETS = [
    'registration-photos','gallery-images','sponsor-logos','team-images','band-images','guest-artist-images','faculty-images','event-images',
    'artists','members','uploads','hero-media','hero-videos','hero-video','guest-artist-videos','pdf','documents'
  ];
  // Normalize a storage/public URL for reliable equality checks
  const normalizeStorageUrl = (raw?: string | null): string => {
    if (!raw) return '';
    try {
      let url = String(raw).trim();
      if (!url) return '';
      // Strip query/hash (signed URLs etc.)
      url = url.split('?')[0].split('#')[0];
      // Remove accidental double slashes (except protocol)
      url = url.replace(/([^:])\/\/+/, '$1/');
      return url;
    } catch {
      return '';
    }
  };
  const urlsEqual = (a?: string | null, b?: string | null) => normalizeStorageUrl(a) === normalizeStorageUrl(b);

  // Scan current client-side cache to see if a URL is still referenced anywhere else
  const isUrlReferencedSomewhere = (target?: string | null, opts?: { table?: string; id?: number | string | null }) => {
    const t = normalizeStorageUrl(target);
    if (!t) return false;
    const skip = (table: string, id: any) => opts && opts.table === table && opts.id === id;

    // gallery_images.src
    for (const g of galleryImages) {
      if (skip('gallery_images', g.id)) continue;
      if (normalizeStorageUrl((g as any).src) === t) return true;
    }
    // sponsors.logo
    for (const s of sponsors) {
      if (skip('sponsors', s.id)) continue;
      if (normalizeStorageUrl((s as any).logo) === t) return true;
    }
    // faculty_heads.image / image_url
    for (const f of facultyHeads) {
      if (skip('faculty_heads', f.id)) continue;
      const u1 = normalizeStorageUrl((f as any).image);
      const u2 = normalizeStorageUrl((f as any).image_url);
      if (u1 === t || u2 === t) return true;
    }
    // core_team_members.image
    for (const m of coreTeamMembers) {
      if (skip('core_team_members', m.id)) continue;
      if (normalizeStorageUrl((m as any).image) === t) return true;
    }
    // band_members.image
    for (const b of bandMembers) {
      if (skip('band_members', b.id)) continue;
      if (normalizeStorageUrl((b as any).image) === t) return true;
    }
    // guest_artists.image / image_url / photo_url
    for (const a of guestArtists) {
      if (skip('guest_artists', a.id)) continue;
      const u1 = normalizeStorageUrl((a as any).image);
      const u2 = normalizeStorageUrl((a as any).image_url);
      const u3 = normalizeStorageUrl((a as any).photo_url);
      const uv = normalizeStorageUrl((a as any).video_url);
      if (u1 === t || u2 === t || u3 === t || uv === t) return true;
    }
    // events.image / motion_poster_url
    for (const e of events) {
      if (skip('events', e.id)) continue;
      const ei = normalizeStorageUrl((e as any).image);
      const em = normalizeStorageUrl((e as any).motion_poster_url);
      if (ei === t || em === t) return true;
    }
    // homepage_settings.hero_media_url and sponsor_logos[].logo_url and brand_logo_url
    if (homepageSettings) {
      const hm = normalizeStorageUrl((homepageSettings as any).hero_media_url);
      if (hm === t) return true;
      const bl = normalizeStorageUrl((homepageSettings as any).brand_logo_url);
      if (bl === t) return true;
      const logos: any[] = (homepageSettings as any).sponsor_logos || [];
      for (const L of logos) {
        if (normalizeStorageUrl(L?.logo_url) === t) return true;
      }
    }
    // sponsorship_settings.brochure_url
    if (sponsorshipSettings) {
      const br = normalizeStorageUrl((sponsorshipSettings as any).brochure_url);
      if (br === t) return true;
    }
    // hero_media per pageKey
    for (const key of Object.keys(heroMedia)) {
      const row = (heroMedia as any)[key] || null;
      if (!row) continue;
      const iu = normalizeStorageUrl(row.image_url);
      const vu = normalizeStorageUrl(row.video_url);
      if (iu === t || vu === t) return true;
    }
    return false;
  };
  const deleteStorageFileByPublicUrl = async (raw?: string | null) => {
    if (!raw) return;
    try {
      let url = raw.trim();
      if (!url) return;
      // Strip query params / fragments (signed URLs etc.)
      url = url.split('?')[0].split('#')[0];
      // If it's already a full Supabase public URL
      let bucket: string | null = null;
      let path: string | null = null;
      const fullMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (fullMatch) {
        bucket = fullMatch[1];
        path = decodeURIComponent(fullMatch[2]);
      } else {
        // Handle relative or plain path forms like "gallery-images/filename.jpg" or just "uploads/foo.png"
        const rel = url.replace(/^\/*/, '');
        const firstSlash = rel.indexOf('/');
        if (firstSlash > 0) {
          const maybeBucket = rel.substring(0, firstSlash);
            if (KNOWN_BUCKETS.includes(maybeBucket)) {
              bucket = maybeBucket;
              path = rel.substring(firstSlash + 1);
            }
        }
      }
      if (!bucket || !path) return; // Not a recognized storage object
      if (!KNOWN_BUCKETS.includes(bucket)) return; // Safety: only delete from known buckets
      const key = bucket + '::' + path;
      if (removedObjectsRef.current.has(key)) return; // Already attempted
      removedObjectsRef.current.add(key);
      if (!path) return;
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        console.warn('[Storage] Failed to remove object', bucket, path, error.message);
      }
    } catch (e) {
      console.warn('[Storage] Unexpected error parsing/removing file', e);
    }
  };

  // Event Coordinators
  const addEventCoordinator = async (coordinator: Omit<EventCoordinator, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('event_coordinators').insert(coordinator as any);
    if (error) throw error;
    await fetchData(true);
  };

  const updateEventCoordinator = async (id: number, patch: Partial<EventCoordinator>) => {
    const { error } = await supabase.from('event_coordinators').update(patch).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteEventCoordinator = async (id: number) => {
    const { error } = await supabase.from('event_coordinators').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleEventFeatured = async (id: number) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    const { error } = await supabase.from('events').update({ featured: !event.featured }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleEventVisibility = async (id: number) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    const { error } = await supabase.from('events').update({ visible: !event.visible }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleEventRegistration = async (id: number) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    const { error } = await supabase.from('events').update({ registration_open: !event.registration_open }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Gallery Management
  const addGalleryImage = async (image: Partial<GalleryImage>) => {
    const { error } = await supabase.from('gallery_images').insert(image);
    if (error) throw error;
    await fetchData(true);
  };

  const updateGalleryImage = async (id: number, image: Partial<GalleryImage>) => {
    const prev = galleryImages.find(g => g.id === id) || null;
    const { error } = await supabase.from('gallery_images').update(image).eq('id', id);
    if (error) throw error;
    // Cleanup old file if replaced
    if (prev && image.src && !urlsEqual((prev as any).src, image.src)) {
      if (!isUrlReferencedSomewhere((prev as any).src, { table: 'gallery_images', id })) {
        deleteStorageFileByPublicUrl((prev as any).src);
      }
    }
    await fetchData(true);
  };

  const deleteGalleryImage = async (id: number) => {
    // Find image first to capture src for storage cleanup
    const img = galleryImages.find(g => g.id === id) || null;
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) throw error;
    // Fire-and-forget storage delete (do not block UI)
    deleteStorageFileByPublicUrl(img?.src);
    await fetchData(true);
  };

  const toggleGalleryImageFeatured = async (id: number) => {
    const image = galleryImages.find(img => img.id === id);
    if (!image) return;
    const { error } = await supabase.from('gallery_images').update({ featured: !image.featured }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Sponsor Management
  const addSponsor = async (sponsor: Partial<Sponsor>) => {
    // Ensure optional fields have safe defaults for current DB constraints
    const payload = {
      ...sponsor,
      description: sponsor.description ?? '',
    } as Partial<Sponsor>;
    const { error } = await supabase.from('sponsors').insert(payload);
    if (error) throw error;
    await fetchData(true);
  };

  const updateSponsor = async (id: number, sponsor: Partial<Sponsor>) => {
    const payload = {
      ...sponsor,
      description: sponsor.description ?? '',
    } as Partial<Sponsor>;
  const { error } = await supabase.from('sponsors').update(payload).eq('id', id);
    if (error) throw error;
    // NOTE: Previously we attempted to automatically delete the previous sponsor logo
    // from storage when it appeared to be unreferenced. This has caused cases where
    // logos disappear from the UI due to subtle URL-normalization or reference-check
    // mismatches. To avoid accidental removal of assets, we no longer auto-delete
    // previous sponsor logos here. If you want automatic cleanup, implement a
    // manual garbage-collection job that verifies references server-side before
    // deleting storage objects.
    await fetchData(true);
  };

  const deleteSponsor = async (id: number) => {
    // Optimistic UI: remove immediately for snappy admin feedback
    const prev = sponsors;
    const exists = sponsors.find((s) => s.id === id);
    if (!exists) return;
    setSponsors((curr) => curr.filter((s) => s.id !== id));

    try {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw error;
      // Attempt to delete logo asset if stored in public bucket and is a full URL
      deleteStorageFileByPublicUrl((exists as any).logo);
    } catch (e) {
      // Revert on failure so UI matches server state
      setSponsors(prev);
      throw e;
    }

    // Background refresh to reconcile ordering and related data
    fetchData(true).catch((e) => console.warn('[Data] background refresh after sponsor delete failed', e));
  };

  const toggleSponsorFeatured = async (id: number) => {
    const sponsor = sponsors.find(s => s.id === id);
    if (!sponsor) return;
    const { error } = await supabase.from('sponsors').update({ featured: !sponsor.featured }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Schedule Management
  const addScheduleDay = async (day: Partial<ScheduleDay>) => {
    const { error } = await supabase.from('schedule_days').insert(day);
    if (error) throw error;
    await fetchData(true);
  };

  const updateScheduleDay = async (id: number, day: Partial<ScheduleDay>) => {
    const { error } = await supabase.from('schedule_days').update(day).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteScheduleDay = async (id: number) => {
    const { error } = await supabase.from('schedule_days').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const addScheduleEvent = async (dayId: number, event: Partial<ScheduleEvent>) => {
    // Normalize time to HH:MM for Postgres TIME
    const normalizeTime = (t: any): string | undefined => {
      if (!t) return undefined;
      const s = String(t).trim();
      // Accept "HH:MM" from input type=time or common variants like "9", "9:30", "9 AM", "9:30 pm"
      const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
      if (!m) return undefined;
      let h = parseInt(m[1], 10);
      let min = m[2] ? parseInt(m[2], 10) : 0;
      const ap = m[3]?.toLowerCase();
      if (ap) {
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
      }
      if (isNaN(h) || isNaN(min)) return undefined;
      h = Math.max(0, Math.min(23, h));
      min = Math.max(0, Math.min(59, min));
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(min)}`;
    };
    // Sanitize payload: convert blank linkage fields to null to satisfy FK constraints
    const payload: any = { ...event, schedule_day_id: dayId };
    if (payload.time !== undefined) {
      const nt = normalizeTime(payload.time);
      if (nt) payload.time = nt as any;
      else delete payload.time;
    }
    const normalize = (v: any) => (v === '' || v === undefined ? null : v);
    payload.event_id = normalize(payload.event_id);
    payload.guest_artist_id = normalize(payload.guest_artist_id);
    // Mutual exclusivity safety: if both somehow set (UI bug), prefer event_id and drop guest_artist_id
    if (payload.event_id && payload.guest_artist_id) {
      payload.guest_artist_id = null;
    }
    // Backward-compat: If columns are not present in DB, omit keys entirely to avoid PostgREST schema errors
    if (payload.event_id === null) delete payload.event_id;
    if (payload.guest_artist_id === null) delete payload.guest_artist_id;
    let { error } = await supabase.from('schedule_events').insert(payload);
    if (error) {
      // Graceful fallback: if new columns aren't in schema cache yet, strip offending keys and retry once
  const msg = ((error as any)?.message || '').toLowerCase() + ' ' + (((error as any)?.details) || '').toLowerCase();
      const safe: any = { ...payload };
      let shouldRetry = false;
      if (msg.includes('guest_artist_id')) { delete safe.guest_artist_id; shouldRetry = true; }
      if (msg.includes('event_id')) { delete safe.event_id; shouldRetry = true; }
      if (shouldRetry) {
        const retry = await supabase.from('schedule_events').insert(safe);
        if (retry.error) {
          console.error('[addScheduleEvent] retry failed', { safe, error: retry.error });
          throw retry.error;
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('[addScheduleEvent] insertion failed', { payload, error });
        throw error;
      }
    }
    await fetchData(true);
  };

  const updateScheduleEvent = async (id: number, event: Partial<ScheduleEvent>) => {
    const normalizeTime = (t: any): string | undefined => {
      if (!t) return undefined;
      const s = String(t).trim();
      const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
      if (!m) return undefined;
      let h = parseInt(m[1], 10);
      let min = m[2] ? parseInt(m[2], 10) : 0;
      const ap = m[3]?.toLowerCase();
      if (ap) {
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
      }
      if (isNaN(h) || isNaN(min)) return undefined;
      h = Math.max(0, Math.min(23, h));
      min = Math.max(0, Math.min(59, min));
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(min)}`;
    };
    // Ensure mutual exclusivity: if event_id provided, clear guest_artist_id unless explicitly set; vice versa.
    const payload: any = { ...event };
    if (payload.time !== undefined) {
      const nt = normalizeTime(payload.time);
      if (nt) payload.time = nt as any;
      else delete payload.time;
    }
    if ('event_id' in payload && payload.event_id) {
      if (!('guest_artist_id' in payload)) payload.guest_artist_id = null;
    } else if ('guest_artist_id' in payload && payload.guest_artist_id) {
      if (!('event_id' in payload)) payload.event_id = null;
    }
    let { error } = await supabase.from('schedule_events').update(payload).eq('id', id);
    if (error) {
  const msg = ((error as any)?.message || '').toLowerCase() + ' ' + (((error as any)?.details) || '').toLowerCase();
      const safe: any = { ...payload };
      let shouldRetry = false;
      if (msg.includes('guest_artist_id')) { delete safe.guest_artist_id; shouldRetry = true; }
      if (msg.includes('event_id')) { delete safe.event_id; shouldRetry = true; }
      if (shouldRetry) {
        const retry = await supabase.from('schedule_events').update(safe).eq('id', id);
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
    }
    await fetchData(true);
  };

  const deleteScheduleEvent = async (id: number) => {
    const { error } = await supabase.from('schedule_events').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Registration Management
  const addRegistration = async (registration: Partial<Registration>) => {
    // Optimistic UI: prepend a pending registration so the modal can confirm instantly
    // This does not affect counts; the background refresh will reconcile actual data
    try {
      setRegistrations((prev) => [{ ...(registration as Registration), status: 'pending' } as Registration, ...prev]);
    } catch {}

    // Encrypt sensitive data before sending to Supabase
    const payload = {
      ...registration,
      email: encryptData(registration.email || ''),
      phone: encryptData(registration.phone || ''),
      college: encryptData(registration.college || ''),
    };

    // Prefer server-side RPC to bypass RLS via SECURITY DEFINER
    // New signature supports p_photo_url; fall back to legacy if not available
    const rpcPayloadNew: Record<string, any> = {
      p_id: registration.id ?? null,
      p_event_id: registration.event_id as number,
      p_event_title: registration.event_title as string,
      p_participant_type: registration.participant_type as string,
      p_full_name: registration.full_name as string,
      p_email: payload.email as string, // Encrypted
      p_phone: payload.phone as string, // Encrypted
      p_college: (payload.college as string) ?? '', // Encrypted
      p_registration_date: (registration as any).registration_date ?? null,
      p_is_team_registration: registration.is_team_registration as boolean,
      p_team_name: (registration as any).team_name ?? null,
      p_team_members: (registration as any).team_members ? JSON.stringify((registration as any).team_members) : null,
      p_total_members: (registration as any).total_members ?? 1,
      p_photo_url: (registration as any).photo_url ?? null,
    };
    let rpcError: any | null = null;
    try {
      const { error } = await supabase.rpc('register_for_event', rpcPayloadNew);
      rpcError = error;
    } catch (e: any) {
      rpcError = e;
    }
    if (rpcError) {
      // Retry with legacy signature (without p_photo_url)
      const { error: legacyError } = await supabase.rpc('register_for_event', {
        p_id: registration.id ?? null,
        p_event_id: registration.event_id as number,
        p_event_title: registration.event_title as string,
        p_participant_type: registration.participant_type as string,
        p_full_name: registration.full_name as string,
        p_email: registration.email as string,
        p_phone: registration.phone as string,
        p_college: (registration.college as string) ?? '',
        p_registration_date: (registration as any).registration_date ?? null,
        p_is_team_registration: registration.is_team_registration as boolean,
        p_team_name: (registration as any).team_name ?? null,
        p_team_members: (registration as any).team_members ? JSON.stringify((registration as any).team_members) : null,
        p_total_members: (registration as any).total_members ?? 1,
      });
      if (legacyError) {
      // Fallback to direct insert in case RPC is not yet deployed
      const { error } = await supabase.from('registrations').insert(registration);
      if (error) throw error;
      }
    }
    // Best-effort: if the table has photo_url but the RPC path didn't set it, patch it in by id
    try {
      if ((registration as any).photo_url && registration.id) {
        await supabase.from('registrations').update({ photo_url: (registration as any).photo_url } as any).eq('id', registration.id as string);
      }
    } catch (e) {
      // ignore if column not present yet or RLS blocks it; export will still work once migrations are applied
      console.warn('Post-insert photo_url patch failed (expected if schema not migrated yet):', e);
    }
    // Avoid blocking the UI on a full refresh; trigger background refresh instead
    // Counts and related views will sync shortly after
    fetchData(true).catch((e) => console.warn('[Data] background refresh after registration failed', e));
  };

  const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('registrations').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const bulkApproveRegistrations = async (ids: string[]) => {
    if (!ids.length) return;
    // Batch in chunks to avoid huge single queries if very large
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('registrations').update({ status: 'approved' }).in('id', slice);
      if (error) throw error;
    }
    await fetchData(true);
  };

  const bulkRejectRegistrations = async (ids: string[]) => {
    if (!ids.length) return;
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('registrations').update({ status: 'rejected' }).in('id', slice);
      if (error) throw error;
    }
    await fetchData(true);
  };

  const deleteRegistration = async (id: string) => {
    const { error, data: deletedReg } = await supabase.from('registrations').delete().eq('id', id).select('*').single();
    if (error) throw error;
    // Best-effort: free storage if photo exists
    try { if ((deletedReg as any)?.photo_url) await deleteStorageFileByPublicUrl((deletedReg as any).photo_url); } catch(e){ console.warn('[Data] reg photo cleanup failed', e); }
    if (deletedReg && deletedReg.event_id) {
      const event = events.find(e => e.id === deletedReg.event_id);
      if (event) {
        const newCount = Math.max(0, (event.current_registrations || 0) - (deletedReg.total_members || 1));
        await supabase.from('events').update({ current_registrations: newCount }).eq('id', event.id);
      }
    }
    await fetchData(true);
  };

  const resetRegistrationIdSequence = async () => {
    const { error } = await supabase.rpc('reset_registration_id_sequence');
    if (error) throw error;
  };

  const bulkDeleteRegistrations = async (ids: string[]) => {
    if (!ids?.length) return;
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      // Delete and return rows so we can cleanup photos and adjust counts
      const { data: rows, error } = await supabase
        .from('registrations')
        .delete()
        .in('id', slice)
        .select('id, event_id, total_members, photo_url');
      if (error) throw error;
      // Clean photos
      try {
        for (const r of rows || []) {
          const url = (r as any)?.photo_url;
          if (url) await deleteStorageFileByPublicUrl(url);
        }
      } catch (e) {
        console.warn('[Data] bulk reg photo cleanup issues', e);
      }
      // Adjust event counts best-effort (use current events state)
      const byEvent: Record<string, number> = {};
      for (const r of rows || []) {
        const eid = (r as any)?.event_id;
        const mem = (r as any)?.total_members || 1;
        if (eid) byEvent[eid] = (byEvent[eid] || 0) + mem;
      }
      for (const [eid, dec] of Object.entries(byEvent)) {
        const event = events.find(e => String(e.id) === String(eid));
        if (event) {
          const newCount = Math.max(0, (event.current_registrations || 0) - dec);
          await supabase.from('events').update({ current_registrations: newCount }).eq('id', event.id);
        }
      }
    }
    await fetchData(true);
  };

  // Sponsorship Settings Management
  const updateSponsorshipSettings = async (settings: Partial<SponsorshipSettings> & { contactSections?: Partial<ContactSection>[] }) => {
    try {
      const { contactSections, ...mainSettingsToUpdate } = settings;

      // Upsert ensures the row with id=1 is created if missing
      const { error: updateMainError } = await supabase
        .from('sponsorship_settings')
        .upsert({ id: 1, ...(mainSettingsToUpdate as any) }, { onConflict: 'id' });

      if (updateMainError) {
        console.error('Error updating main sponsorship settings:', updateMainError);
        const msg = (updateMainError as any)?.message || '';
        const code = (updateMainError as any)?.code || '';
        if (code === 'PGRST205' || /Could not find the table|schema cache|sponsorship_settings/.test(msg)) {
          throw new Error('MISSING_SPONSORSHIP_TABLES');
        }
        throw updateMainError;
      }

      if (contactSections !== undefined) {
        const { error: deleteError } = await supabase
          .from('contact_sections')
          .delete()
          .eq('sponsorship_settings_id', 1);

        if (deleteError) {
          console.error('Error deleting old contact sections:', deleteError);
          throw deleteError;
        }

        if (contactSections.length > 0) {
          const contactSectionsToInsert = contactSections.map(section => ({
            ...section,
            sponsorship_settings_id: 1
          }));

          const { error: insertError } = await supabase
            .from('contact_sections')
            .insert(contactSectionsToInsert);

          if (insertError) {
            console.error('Error inserting new contact sections:', insertError);
            throw insertError;
          }
        }
      }

      // Clean up replaced brochure if stored in storage
      try {
        const prev = sponsorshipSettings;
        if (prev && Object.prototype.hasOwnProperty.call(mainSettingsToUpdate, 'brochure_url')) {
          const newB = (mainSettingsToUpdate as any).brochure_url;
          const oldB = (prev as any).brochure_url;
          if (newB && !urlsEqual(oldB, newB)) {
            if (!isUrlReferencedSomewhere(oldB, { table: 'sponsorship_settings', id: 1 })) {
              deleteStorageFileByPublicUrl(oldB);
            }
          }
        }
      } catch (e) {
        console.warn('[Data] sponsorship_settings brochure cleanup failed', e);
      }

  await fetchData(true);
    } catch (error) {
      console.error('Failed to update sponsorship settings:', error);
      throw error;
    }
  };

  // Contact Sections Management
  const addContactSection = async (section: Partial<ContactSection>) => {
    const payload = { ...section, sponsorship_settings_id: 1 } as any;
    const { error } = await supabase.from('contact_sections').insert(payload);
    if (error) throw error;
    await fetchData(true);
  };

  const updateContactSection = async (id: number, section: Partial<ContactSection>) => {
    const { error } = await supabase.from('contact_sections').update(section).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteContactSection = async (id: number) => {
    const { error } = await supabase.from('contact_sections').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Event Categories Management
  const addEventCategory = async (category: Partial<EventCategory>) => {
    const { error } = await supabase.from('event_categories').insert(category);
    if (error) throw error;
    await fetchData(true);
  };

  const updateEventCategory = async (id: number, category: Partial<EventCategory>) => {
    const { error } = await supabase.from('event_categories').update(category).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteEventCategory = async (id: number) => {
    // Optimistic UI update for snappy admin UX; we'll reconcile after RPC
    const prev = eventCategories;
    const removing = eventCategories.find((c) => c.id === id) || null;
    if (!removing) return;
    setEventCategories((curr) => curr.filter((c) => c.id !== id));

    try {
      // Use SECURITY DEFINER RPC to perform atomic reassignment + delete under owner privileges
      const { error: rpcError } = await supabase.rpc('delete_event_category', {
        p_category_id: id,
        p_fallback_name: null,
      });
      if (rpcError) throw rpcError;
    } catch (e) {
      // Revert on failure
      setEventCategories(prev);
      throw e;
    }

    // Background refresh to ensure consistency
    fetchData(true).catch((e) => console.warn('[Data] background refresh after category delete failed', e));
  };

  // Social Media Settings Management
  const updateSocialMediaSettings = async (settings: Partial<SocialMediaSettings>) => {
    // Convert camelCase patch -> snake_case for DB
    const patch: Record<string, any> = {};
    if (settings.instagramEnabled !== undefined) patch.instagram_enabled = settings.instagramEnabled;
    if (settings.instagramUrl !== undefined) patch.instagram_url = settings.instagramUrl;
    if (settings.youtubeEnabled !== undefined) patch.youtube_enabled = settings.youtubeEnabled;
    if (settings.youtubeUrl !== undefined) patch.youtube_url = settings.youtubeUrl;
    const { error } = await supabase.from('social_media_settings').update(patch).eq('id', 1);
    if (error) throw error;
    await fetchData(true);
  };

  // Faculty Heads Management
  const addFacultyHead = async (head: Partial<FacultyHead>) => {
    const { error } = await supabase.from('faculty_heads').insert(head);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const code = (error as any)?.code || '';
      const schemaCacheUnknown = msg.includes('schema cache') && (msg.includes('could not find') || msg.includes('not found') || msg.includes('social_links'));
      if (code === '42703' || (msg.includes('column') && msg.includes('does not exist')) || schemaCacheUnknown) {
        // Fallback if new optional columns (email/phone/social_links) aren’t deployed yet
        const { email, phone, social_links, ...rest } = (head as any) || {};
        const { error: e2 } = await supabase.from('faculty_heads').insert(rest as any);
        if (e2) throw e2;
      } else {
        throw error;
      }
    }
    await fetchData(true);
  };

  const updateFacultyHead = async (id: number, head: Partial<FacultyHead>) => {
    const prev = facultyHeads.find(h => h.id === id) || null;
    const { error } = await supabase.from('faculty_heads').update(head).eq('id', id);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const code = (error as any)?.code || '';
      const schemaCacheUnknown = msg.includes('schema cache') && (msg.includes('could not find') || msg.includes('not found') || msg.includes('social_links'));
      if (code === '42703' || (msg.includes('column') && msg.includes('does not exist')) || schemaCacheUnknown) {
        const { email, phone, social_links, ...rest } = (head as any) || {};
        const { error: e2 } = await supabase.from('faculty_heads').update(rest as any).eq('id', id);
        if (e2) throw e2;
      } else {
        throw error;
      }
    }
    // Delete any replaced image
    if (prev) {
      const newImg = (head as any)?.image;
      const newUrl = (head as any)?.image_url;
      const oldA = (prev as any)?.image;
      const oldB = (prev as any)?.image_url;
      const toDelete: string[] = [];
      if (newImg && !urlsEqual(oldA, newImg)) toDelete.push(oldA);
      if (newUrl && !urlsEqual(oldB, newUrl)) toDelete.push(oldB);
      for (const u of toDelete.filter(Boolean)) {
        if (!isUrlReferencedSomewhere(u, { table: 'faculty_heads', id })) {
          deleteStorageFileByPublicUrl(u);
        }
      }
    }
    await fetchData(true);
  };

  const deleteFacultyHead = async (id: number) => {
    const head = facultyHeads.find(h => h.id === id) || null;
    const { error } = await supabase.from('faculty_heads').delete().eq('id', id);
    if (error) throw error;
    deleteStorageFileByPublicUrl((head as any)?.image || (head as any)?.image_url);
    await fetchData(true);
  };

  const toggleFacultyHeadEnabled = async (id: number) => {
    const head = facultyHeads.find(h => h.id === id);
    if (!head) return;
    const { error } = await supabase.from('faculty_heads').update({ enabled: !head.enabled }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Core Committees Management
  const addCoreCommittee = async (committee: Partial<CoreCommittee>) => {
    const { error } = await supabase.from('core_committees').insert(committee);
    if (error) throw error;
    await fetchData(true);
  };

  const updateCoreCommittee = async (id: number, committee: Partial<CoreCommittee>) => {
    const { error } = await supabase.from('core_committees').update(committee).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteCoreCommittee = async (id: number) => {
    const { error } = await supabase.from('core_committees').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleCoreCommitteeEnabled = async (id: number) => {
    const committee = coreCommittees.find(c => c.id === id);
    if (!committee) return;
    const { error } = await supabase
      .from('core_committees')
      .update({ enabled: !committee.enabled })
      .eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Core Team Members Management
  const addCoreTeamMember = async (member: Partial<CoreTeamMember>) => {
    // Translate camelCase UI fields to DB snake_case when present
    const payload: any = { ...member };
    if (Object.prototype.hasOwnProperty.call(payload, 'isCouncil')) {
      payload.is_council = (payload.isCouncil as any) ?? false;
      delete payload.isCouncil;
    }
    const { error } = await supabase.from('core_team_members').insert(payload);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      // Fallback if optional columns aren't in schema yet
      const unknownColumn = msg.includes('column') && msg.includes('does not exist');
      if (unknownColumn && (msg.includes('phone') || msg.includes('social_links'))) {
        const { phone, social_links, ...rest } = (member as any) || {};
        const { error: e2 } = await supabase.from('core_team_members').insert(rest as any);
        if (e2) throw e2;
      } else if (msg.includes('foreign key') && msg.includes('committee') && msg.includes('constraint')) {
        throw new Error('Invalid committee selected for member');
      } else {
        throw error;
      }
    }
    await fetchData(true);
  };

  const updateCoreTeamMember = async (id: number, member: Partial<CoreTeamMember>) => {
    const prev = coreTeamMembers.find(m => m.id === id) || null;
    // Translate camelCase UI fields to DB snake_case for update
    const payload: any = { ...member };
    if (Object.prototype.hasOwnProperty.call(payload, 'isCouncil')) {
      payload.is_council = (payload.isCouncil as any) ?? false;
      delete payload.isCouncil;
    }
    const { error } = await supabase.from('core_team_members').update(payload).eq('id', id);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const unknownColumn = msg.includes('column') && msg.includes('does not exist');
      if (unknownColumn && (msg.includes('phone') || msg.includes('social_links'))) {
        const { phone, social_links, ...rest } = (member as any) || {};
        const { error: e2 } = await supabase.from('core_team_members').update(rest as any).eq('id', id);
        if (e2) throw e2;
      } else if (msg.includes('foreign key') && msg.includes('committee') && msg.includes('constraint')) {
        throw new Error('Invalid committee selected for member');
      } else {
        throw error;
      }
    }
    if (prev && (member as any)?.image && !urlsEqual((prev as any).image, (member as any).image)) {
      if (!isUrlReferencedSomewhere((prev as any).image, { table: 'core_team_members', id })) {
        deleteStorageFileByPublicUrl((prev as any).image);
      }
    }
    await fetchData(true);
  };

  const deleteCoreTeamMember = async (id: number) => {
    const member = coreTeamMembers.find(m => m.id === id) || null;
    const { error } = await supabase.from('core_team_members').delete().eq('id', id);
    if (error) throw error;
    deleteStorageFileByPublicUrl((member as any)?.image);
    await fetchData(true);
  };

  const toggleCoreTeamMemberEnabled = async (id: number) => {
    const member = coreTeamMembers.find(m => m.id === id);
    if (!member) return;
    const { error } = await supabase.from('core_team_members').update({ enabled: !member.enabled }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleCoreTeamMemberIsHead = async (id: number) => {
    const member = coreTeamMembers.find(m => m.id === id);
    if (!member) return;
    // If we're turning on is_head, ensure is_council is turned off to enforce mutual exclusivity
    const payload: any = { is_head: !member.is_head };
    if (!member.is_head) {
      payload.is_council = false;
    }
    const { error } = await supabase.from('core_team_members').update(payload).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Sports Committees Management
  const addSportsCommittee = async (committee: Partial<SportsCommittee>) => {
    const { error } = await supabase.from('sports_committees' as any).insert(committee as any);
    if (error) throw error;
    await fetchData(true);
  };

  const updateSportsCommittee = async (id: number, committee: Partial<SportsCommittee>) => {
    const { error } = await supabase.from('sports_committees' as any).update(committee as any).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteSportsCommittee = async (id: number) => {
    const { error } = await supabase.from('sports_committees' as any).delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleSportsCommitteeEnabled = async (id: number) => {
    const committee = sportsCommittees.find(c => c.id === id);
    if (!committee) return;
    const { error } = await supabase.from('sports_committees' as any).update({ enabled: !committee.enabled } as any).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Sports Team Members Management
  const addSportsTeamMember = async (member: Partial<SportsTeamMember>) => {
    // Strip fields not guaranteed to exist in older schemas
    const { specialty, ...safeMember } = (member as any) || {};
    const { error } = await supabase.from('sports_team_members' as any).insert(safeMember as any);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const unknownColumn = (
        (msg.includes('column') && msg.includes('does not exist')) ||
        (msg.includes('could not find') && msg.includes('schema cache'))
      );
      if (unknownColumn && (msg.includes('phone') || msg.includes('social_links') || msg.includes('specialty'))) {
        const { phone, social_links, specialty: _s, ...rest } = (member as any) || {};
        const { error: e2 } = await supabase.from('sports_team_members' as any).insert(rest as any);
        if (e2) throw e2;
      } else if (msg.includes('foreign key') && msg.includes('committee') && msg.includes('constraint')) {
        throw new Error('Invalid committee selected for sports member');
      } else {
        throw error;
      }
    }
    await fetchData(true);
  };

  const updateSportsTeamMember = async (id: number, member: Partial<SportsTeamMember>) => {
    const prev = sportsTeamMembers.find(m => m.id === id) || null;
    const { specialty, ...safeMember } = (member as any) || {};
    const { error } = await supabase.from('sports_team_members' as any).update(safeMember as any).eq('id', id);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const unknownColumn = (
        (msg.includes('column') && msg.includes('does not exist')) ||
        (msg.includes('could not find') && msg.includes('schema cache'))
      );
      if (unknownColumn && (msg.includes('phone') || msg.includes('social_links') || msg.includes('specialty'))) {
        const { phone, social_links, specialty: _s, ...rest } = (member as any) || {};
        const { error: e2 } = await supabase.from('sports_team_members' as any).update(rest as any).eq('id', id);
        if (e2) throw e2;
      } else if (msg.includes('foreign key') && msg.includes('committee') && msg.includes('constraint')) {
        throw new Error('Invalid committee selected for sports member');
      } else {
        throw error;
      }
    }
    // Cleanup replaced image if changed
    if (prev && (member as any)?.image && !urlsEqual((prev as any).image, (member as any).image)) {
      if (!isUrlReferencedSomewhere((prev as any).image, { table: 'sports_team_members', id })) {
        deleteStorageFileByPublicUrl((prev as any).image);
      }
    }
    await fetchData(true);
  };

  const deleteSportsTeamMember = async (id: number) => {
    const member = sportsTeamMembers.find(m => m.id === id) || null;
    const { error } = await supabase.from('sports_team_members' as any).delete().eq('id', id);
    if (error) throw error;
    deleteStorageFileByPublicUrl((member as any)?.image);
    await fetchData(true);
  };

  const toggleSportsTeamMemberEnabled = async (id: number) => {
    const member = sportsTeamMembers.find(m => m.id === id);
    if (!member) return;
    const { error } = await supabase.from('sports_team_members' as any).update({ enabled: !member.enabled } as any).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleSportsTeamMemberIsHead = async (id: number) => {
    const member = sportsTeamMembers.find(m => m.id === id);
    if (!member) return;
    const { error } = await supabase.from('sports_team_members' as any).update({ is_head: !member.is_head } as any).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Band Members Management
  const addBandMember = async (member: Partial<BandMember>) => {
    // Ensure the caller is authenticated (RLS requires authenticated role for insert)
    const { data: auth } = await supabase.auth.getSession();
    if (!auth || !auth.session) {
      throw new Error('You must be logged in to add band members.');
    }
    const { error } = await supabase.from('band_members').insert(member);
    if (error) {
      // Surface a readable message back to UI
      throw new Error(error.message || 'Insert failed');
    }
    await fetchData(true);
  };

  const updateBandMember = async (id: number, member: Partial<BandMember>) => {
    const prev = bandMembers.find(m => m.id === id) || null;
    const { error } = await supabase.from('band_members').update(member).eq('id', id);
    if (error) throw error;
    if (prev && (member as any)?.image && !urlsEqual((prev as any).image, (member as any).image)) {
      if (!isUrlReferencedSomewhere((prev as any).image, { table: 'band_members', id })) {
        deleteStorageFileByPublicUrl((prev as any).image);
      }
    }
    await fetchData(true);
  };

  const deleteBandMember = async (id: number) => {
    const member = bandMembers.find(m => m.id === id) || null;
    const { error } = await supabase.from('band_members').delete().eq('id', id);
    if (error) throw error;
    deleteStorageFileByPublicUrl((member as any)?.image);
    await fetchData(true);
  };

  const toggleBandMemberEnabled = async (id: number) => {
    const member = bandMembers.find(m => m.id === id);
    if (!member) return;
    const { error } = await supabase.from('band_members').update({ enabled: !member.enabled }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleBandMemberFeatured = async (id: number) => {
    const member = bandMembers.find(m => m.id === id);
    if (!member) return;
    const { error } = await supabase.from('band_members').update({ is_featured: !member.is_featured }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Guest Artists Management
  const addGuestArtist = async (artist: Partial<GuestArtist>) => {
    const { error } = await supabase.from('guest_artists').insert(artist);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const code = (error as any)?.code || '';
      const schemaCacheUnknown = msg.includes('schema cache') && (msg.includes('could not find') || msg.includes('not found'));
      if (code === '42703' || msg.includes('column') && msg.includes('does not exist') || schemaCacheUnknown) {
        // Strip columns that may not exist yet if migration hasn't been applied (graceful degradation)
        const {
          performance_at,
          venue,
          countdown_enabled,
          live_now_enabled,
          watch_live_url,
          card_media_url,
          card_media_is_video,
          detail_music_url,
          ...rest
        } = (artist as any) || {};
        const { error: e2 } = await supabase.from('guest_artists').insert(rest as any);
        if (e2) throw e2;
      } else {
        throw error;
      }
    }
    await fetchData(true);
  };

  const updateGuestArtist = async (id: number, artist: Partial<GuestArtist>) => {
    const prev = guestArtists.find(a => a.id === id) || null;
    const { error } = await supabase.from('guest_artists').update(artist).eq('id', id);
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const code = (error as any)?.code || '';
      const schemaCacheUnknown = msg.includes('schema cache') && (msg.includes('could not find') || msg.includes('not found'));
      if (code === '42703' || msg.includes('column') && msg.includes('does not exist') || schemaCacheUnknown) {
        // Strip possibly non-migrated columns and retry
        const {
          performance_at,
          venue,
          countdown_enabled,
          live_now_enabled,
          watch_live_url,
          card_media_url,
          card_media_is_video,
          detail_music_url,
          ...rest
        } = (artist as any) || {};
        const { error: e2 } = await supabase.from('guest_artists').update(rest as any).eq('id', id);
        if (e2) throw e2;
      } else {
        throw error;
      }
    }
    if (prev) {
  const newImg = (artist as any)?.image;
  const newUrl = (artist as any)?.image_url;
  const newPhoto = (artist as any)?.photo_url;
  const newVideo = (artist as any)?.video_url;
  const newCardMedia = (artist as any)?.card_media_url;
  const newDetailMusic = (artist as any)?.detail_music_url;
  const oldImg = (prev as any)?.image;
  const oldUrl = (prev as any)?.image_url;
  const oldPhoto = (prev as any)?.photo_url;
  const oldVideo = (prev as any)?.video_url;
  const oldCardMedia = (prev as any)?.card_media_url;
  const oldDetailMusic = (prev as any)?.detail_music_url;
      const toDelete: string[] = [];
  if (newImg && !urlsEqual(oldImg, newImg)) toDelete.push(oldImg);
  if (newUrl && !urlsEqual(oldUrl, newUrl)) toDelete.push(oldUrl);
  if (newPhoto && !urlsEqual(oldPhoto, newPhoto)) toDelete.push(oldPhoto);
  if (newVideo && !urlsEqual(oldVideo, newVideo)) toDelete.push(oldVideo);
  if (newCardMedia && !urlsEqual(oldCardMedia, newCardMedia)) toDelete.push(oldCardMedia);
  if (newDetailMusic && !urlsEqual(oldDetailMusic, newDetailMusic)) toDelete.push(oldDetailMusic);
      for (const u of toDelete.filter(Boolean)) {
        if (!isUrlReferencedSomewhere(u, { table: 'guest_artists', id })) {
          deleteStorageFileByPublicUrl(u);
        }
      }
    }
    await fetchData(true);
  };

  const deleteGuestArtist = async (id: number) => {
    const artist = guestArtists.find(a => a.id === id) || null;
    const { error } = await supabase.from('guest_artists').delete().eq('id', id);
    if (error) throw error;
  deleteStorageFileByPublicUrl((artist as any)?.image || (artist as any)?.image_url || (artist as any)?.photo_url);
  deleteStorageFileByPublicUrl((artist as any)?.video_url);
  deleteStorageFileByPublicUrl((artist as any)?.card_media_url);
  deleteStorageFileByPublicUrl((artist as any)?.detail_music_url);
    await fetchData(true);
  };

  const toggleGuestArtistEnabled = async (id: number) => {
    const artist = guestArtists.find(a => a.id === id);
    if (!artist) return;
    const { error } = await supabase.from('guest_artists').update({ enabled: !artist.enabled }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const toggleGuestArtistFeatured = async (id: number) => {
    const artist = guestArtists.find(a => a.id === id);
    if (!artist) return;
    const { error } = await supabase.from('guest_artists').update({ is_featured: !artist.is_featured }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Chief Guests Management
  const addChiefGuest = async (guest: Partial<ChiefGuest>) => {
    // Auto-append order_position if not provided: place at end
    let toInsert: any = { ...guest };
    if (toInsert.order_position == null) {
      const maxPos = chiefGuests.reduce((m, g) => {
        const p = g.order_position ?? 0; return p > m ? p : m;
      }, 0);
      toInsert.order_position = maxPos + 1;
    }
    const { error } = await supabase.from('chief_guests').insert(toInsert);
    if (error) throw error;
    await fetchData(true);
  };

  const updateChiefGuest = async (id: number, guest: Partial<ChiefGuest>) => {
    const prev = chiefGuests.find(g => g.id === id) || null;
    const { error } = await supabase.from('chief_guests').update(guest).eq('id', id);
    if (error) throw error;
    if (prev && (guest as any)?.image && !urlsEqual((prev as any).image, (guest as any).image)) {
      if (!isUrlReferencedSomewhere((prev as any).image, { table: 'chief_guests', id })) {
        deleteStorageFileByPublicUrl((prev as any).image);
      }
    }
    await fetchData(true);
  };

  const deleteChiefGuest = async (id: number) => {
    const prev = chiefGuests.find(g => g.id === id) || null;
    const { error } = await supabase.from('chief_guests').delete().eq('id', id);
    if (error) throw error;
    deleteStorageFileByPublicUrl((prev as any)?.image);
    // After deletion, compact order_position values so they remain 1..n
    try {
      // Refetch quickly to get current list minus deleted one
      const { data: current, error: fetchErr } = await supabase.from('chief_guests').select('id, order_position').order('order_position', { ascending: true });
      if (!fetchErr && current) {
        let dirty = false;
        const updates: { id: number; order_position: number }[] = [];
        current.forEach((row, idx) => {
          const desired = idx + 1;
          if ((row as any).order_position !== desired) {
            dirty = true;
            updates.push({ id: (row as any).id, order_position: desired });
          }
        });
        if (dirty) {
          await Promise.all(updates.map(u => supabase.from('chief_guests').update({ order_position: u.order_position }).eq('id', u.id)));
        }
      }
    } catch (e) {
      console.warn('Order normalization after chief guest delete failed:', e);
    }
    await fetchData(true);
  };

  const toggleChiefGuestEnabled = async (id: number) => {
    const cg = chiefGuests.find(g => g.id === id);
    if (!cg) return;
    const { error } = await supabase.from('chief_guests').update({ enabled: !cg.enabled }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Sponsorship Packages Management
  const addSponsorshipPackage = async (pkg: Partial<SponsorshipPackage>) => {
    const { error } = await supabase.from('sponsorship_packages').insert(pkg);
    if (error) throw error;
    await fetchData(true);
  };

  const updateSponsorshipPackage = async (id: number, pkg: Partial<SponsorshipPackage>) => {
    const { error } = await supabase.from('sponsorship_packages').update(pkg).eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  const deleteSponsorshipPackage = async (id: number) => {
    const { error } = await supabase.from('sponsorship_packages').delete().eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  const toggleSponsorshipPackageEnabled = async (id: number) => {
    const pkg = sponsorshipPackages.find(p => p.id === id);
    if (!pkg) return;
    const { error } = await supabase.from('sponsorship_packages').update({ enabled: !pkg.enabled }).eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  // Audition Management
  const addAudition = async (audition: Partial<Audition>) => {
    // Client-side guard: respect form settings
    if (formSettings && formSettings.audition_form_enabled === false) {
      throw new Error('Auditions are currently closed');
    }
    // Optimistic add for instant feedback
    let rollback: (() => void) | null = null;
    try {
      // Insert and return the created row so we get id/created_at reliably
      const insertQuery = supabase.from('auditions').insert(audition).select('*');
      const { data, error } = await insertQuery.single();
      if (error) {
        const err = new Error(error.message || 'Failed to submit audition');
        (err as any).code = (error as any).code;
        (err as any).details = (error as any).details;
        (err as any).hint = (error as any).hint;
        throw err;
      }
      if (data) {
        // Prepend the actual row
        setAuditions((prev) => [data as Audition, ...prev.filter((a) => (a as any).__optimistic !== true)]);
        return;
      }
      // Fallback: if no row returned, optimistic + background refresh
      rollback = (() => setAuditions((prev) => prev.filter((a) => (a as any).__optimistic !== true)));
      setAuditions((prev) => [{ ...(audition as Audition), status: 'pending', __optimistic: true } as any, ...prev]);
      fetchData(true).catch((e) => console.warn('[Data] background refresh after audition add failed', e));
    } catch (e) {
      if (rollback) try { rollback(); } catch {}
      throw e;
    }
  };

  const updateAuditionStatus = async (id: string, status: 'pending' | 'reviewed' | 'contacted') => {
    const { error } = await supabase.from('auditions').update({ status }).eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  const deleteAudition = async (id: string) => {
    const { error } = await supabase.from('auditions').delete().eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  // Membership Management
  const addMembership = async (membership: Partial<Membership>) => {
    // Client-side guard: respect form settings
    if (formSettings && formSettings.membership_form_enabled === false) {
      throw new Error('Membership applications are currently closed');
    }
    // Optimistic add for instant feedback
    try { setMemberships((prev) => [{ ...(membership as Membership), status: 'pending' } as Membership, ...prev]); } catch {}
    const { error } = await supabase.from('memberships').insert(membership);
    if (error) throw error;
    // Background refresh; don't block UI
    fetchData(true).catch((e) => console.warn('[Data] background refresh after membership add failed', e));
  };

  const updateMembershipStatus = async (id: string, status: 'pending' | 'reviewed' | 'accepted') => {
    const { error } = await supabase.from('memberships').update({ status }).eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  const deleteMembership = async (id: string) => {
    const { error } = await supabase.from('memberships').delete().eq('id', id);
    if (error) throw error;
  await fetchData(true);
  };

  // Form Settings Management
  const updateFormSettings = async (settings: Partial<FormSettings>) => {
    // Ensure singleton row (id=1) exists and is updated
    const payload = { id: 1, ...settings } as Partial<FormSettings> & { id: number };
    let { error } = await supabase
      .from('form_settings')
      .upsert(payload, { onConflict: 'id' });
    // Fallback path: if RLS blocks the write, delegate to Netlify function using service role
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      const rlsBlocked = msg.includes('rls') || msg.includes('policy') || msg.includes('permission') || msg.includes('not allowed');
      if (rlsBlocked) {
        // First try RPC which can bypass RLS via SECURITY DEFINER on Supabase
        try {
          const { data: row, error: rpcErr } = await supabase.rpc('update_form_settings', {
            p_audition_form_enabled: (settings as any).audition_form_enabled ?? null,
            p_audition_form_message: (settings as any).audition_form_message ?? null,
            p_membership_form_enabled: (settings as any).membership_form_enabled ?? null,
            p_membership_form_message: (settings as any).membership_form_message ?? null,
          });
          if (!rpcErr && row) {
            await fetchData(true);
            return;
          }
          // If RPC missing or still blocked, fall back to Netlify function if available
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) throw (rpcErr || error);
          let resp = await fetch('/.netlify/functions/update-form-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(settings),
          });
          if (!resp.ok) {
            // Try Netlify redirect style /api route as a fallback
            try {
              resp = await fetch('/api/update-form-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(settings),
              });
            } catch {}
          }
          if (!resp.ok) {
            const ct = resp.headers.get('content-type') || '';
            let msg2 = '';
            try {
              if (ct.includes('application/json')) {
                const j = await resp.json();
                msg2 = (j && (j.message || j.error || j.body)) || '';
              } else {
                msg2 = await resp.text();
              }
            } catch {}
            if (resp.status === 404) {
              throw new Error('Admin API missing. Start Netlify dev or deploy to use this action.');
            }
            throw new Error(msg2 || `Failed to update form settings (HTTP ${resp.status})`);
          }
        } catch (e) {
          throw e;
        }
      } else if (msg.includes('does not exist') || msg.includes('not found')) {
        const { error: insErr } = await supabase.from('form_settings').insert(payload as any);
        if (insErr) throw insErr;
      } else {
        throw error;
      }
    }
  await fetchData(true);
  };

  // Homepage Settings Management
  const updateHomepageSettings = async (settings: Partial<HomepageSettings>) => {
    // Upsert singleton row (id=1) for resilience if it was ever deleted
    const payload: Partial<HomepageSettings> & { id: number } = { id: 1, ...settings } as any;
    // Ensure sponsor_logos is JSON serializable
    if (payload.sponsor_logos && typeof payload.sponsor_logos !== 'object') {
      try { payload.sponsor_logos = JSON.parse(String(payload.sponsor_logos)); } catch { /* ignore */ }
    }
    const prev = homepageSettings;
    let { error } = await supabase
      .from('homepage_settings')
      .upsert(payload, { onConflict: 'id' });
    // Some self-hosted or older PostgRESTs can fail upsert if row missing; fallback to insert
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      if (msg.includes('duplicate key') || msg.includes('conflict')) {
        // Race or already exists; ignore and continue
        error = null as any;
      } else {
        // Try insert then update as last resort
        const { error: insertErr } = await supabase
          .from('homepage_settings')
          .insert({ id: 1 } as any);
        if (insertErr && !String(insertErr.message || '').toLowerCase().includes('duplicate')) {
          throw error; // original error
        }
        const { error: updateErr } = await supabase
          .from('homepage_settings')
          .update(settings as any)
          .eq('id', 1);
        if (updateErr) throw updateErr;
      }
    }
    // Cleanup replaced/removed homepage assets
    try {
      if (prev) {
        if (Object.prototype.hasOwnProperty.call(payload, 'hero_media_url')) {
          const newHM = (payload as any).hero_media_url;
          if (newHM && !urlsEqual(prev.hero_media_url as any, newHM)) {
            if (!isUrlReferencedSomewhere(prev.hero_media_url as any, { table: 'homepage_settings', id: 1 })) {
              deleteStorageFileByPublicUrl(prev.hero_media_url as any);
            }
          }
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'sponsor_logos')) {
          const oldLogos: any[] = ((prev as any).sponsor_logos || []) as any[];
          const newLogos: any[] = (((payload as any).sponsor_logos || []) as any[]);
          const oldById = new Map<any, any>();
          const newById = new Map<any, any>();
          for (const L of oldLogos) if (L && L.id != null) oldById.set(L.id, L);
          for (const L of newLogos) if (L && L.id != null) newById.set(L.id, L);
          const oldUrls = oldLogos.map((L: any) => normalizeStorageUrl(L?.logo_url)).filter(Boolean);
          const newUrls = newLogos.map((L: any) => normalizeStorageUrl(L?.logo_url)).filter(Boolean);
          for (const [id, o] of oldById.entries()) {
            if (newById.has(id)) {
              const n = newById.get(id);
              const ou = normalizeStorageUrl(o?.logo_url);
              const nu = normalizeStorageUrl(n?.logo_url);
              if (ou && nu && ou !== nu) {
                if (!isUrlReferencedSomewhere(ou, { table: 'homepage_settings', id: 1 })) {
                  deleteStorageFileByPublicUrl(ou);
                }
              }
            }
          }
          for (const ou of oldUrls) {
            if (ou && !newUrls.includes(ou)) {
              if (!isUrlReferencedSomewhere(ou, { table: 'homepage_settings', id: 1 })) {
                deleteStorageFileByPublicUrl(ou);
              }
            }
          }
        }
        // Brand logo cleanup if replaced
        if (Object.prototype.hasOwnProperty.call(payload, 'brand_logo_url')) {
          const old = normalizeStorageUrl((prev as any).brand_logo_url);
          const neu = normalizeStorageUrl((payload as any).brand_logo_url);
          if (old && old !== neu) {
            if (!isUrlReferencedSomewhere(old, { table: 'homepage_settings', id: 1 })) {
              deleteStorageFileByPublicUrl(old);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Data] homepage_settings cleanup failed', e);
    }
    // Lightweight refresh to avoid heavy full fetch churn during admin auto-saves
    try {
      const { data, error: refetchErr } = await supabase
        .from('homepage_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (!refetchErr) {
        setHomepageSettings(data || null);
      }
    } catch (e) {
      // Fallback: schedule a background full refresh if something odd happens
      fetchData(true).catch(() => {});
    }
  };

  // HomeBound Settings Management
  const updateHomeboundSettings = async (settings: Partial<HomeboundSettings>) => {
    // Upsert singleton row id=1 for resilience
    const { error } = await supabase
      .from('homebound_settings')
      .upsert({ id: 1, ...(settings as any) }, { onConflict: 'id' });
    if (error) throw error;
  await fetchData(true);
  };

  const updateSiteSettings = async (settings: Partial<SiteSettings>) => {
    const payload: Partial<SiteSettings> & { id: number } = { id: 1, ...settings } as any;
    const { error } = await supabase
      .from('site_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    // Lightweight refetch to avoid full churn
    try {
      const { data, error: refErr } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (!refErr) setSiteSettings(data || null);
    } catch {
      fetchData(true).catch(() => {});
    }
  };

  const updateAboutSettings = async (settings: Partial<AboutSettings>) => {
    // Upsert singleton row id=1
    // Ensure json arrays are arrays
    const payload: any = { id: 1, ...settings };
    if (payload.hero_paragraphs && !Array.isArray(payload.hero_paragraphs)) {
      try { payload.hero_paragraphs = JSON.parse(String(payload.hero_paragraphs)); } catch { payload.hero_paragraphs = []; }
    }
    if (payload.tracks && !Array.isArray(payload.tracks)) {
      try { payload.tracks = JSON.parse(String(payload.tracks)); } catch { payload.tracks = []; }
    }
    if (payload.zones && !Array.isArray(payload.zones)) {
      try { payload.zones = JSON.parse(String(payload.zones)); } catch { payload.zones = []; }
    }
    if (payload.stats && !Array.isArray(payload.stats)) {
      try { payload.stats = JSON.parse(String(payload.stats)); } catch { payload.stats = []; }
    }
    // tracksLabel and zonesLabel are simple strings, no conversion needed
    const { error } = await supabase
      .from('about_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    await fetchData(true);
  };

  const updateGallerySettings = async (settings: Partial<GallerySettings>) => {
    const payload: Partial<GallerySettings> & { id: number } = { id: 1, ...settings } as any;
    const { error } = await supabase
      .from('gallery_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  await fetchData(true);
  };

  // Roadmap Milestones CRUD
  const addRoadmapMilestone = async (m: Partial<RoadmapMilestone>) => {
    const { error } = await supabase.from('roadmap_milestones').insert({
      year: m.year || new Date().getFullYear(),
      title: m.title || null,
      points: m.points || [],
      order_position: m.order_position ?? (roadmapMilestones.length + 1),
      enabled: m.enabled ?? true,
      side: m.side || 'auto'
    });
  if (error) throw error; await fetchData(true);
  };
  const updateRoadmapMilestone = async (id: number, m: Partial<RoadmapMilestone>) => {
  const { error } = await supabase.from('roadmap_milestones').update(m).eq('id', id);
  if (error) throw error; await fetchData(true);
  };
  const deleteRoadmapMilestone = async (id: number) => {
  const { error } = await supabase.from('roadmap_milestones').delete().eq('id', id);
  if (error) throw error; await fetchData(true);
  };
  const toggleRoadmapMilestoneEnabled = async (id: number) => {
    const row = roadmapMilestones.find(r => r.id === id); if (!row) return;
  const { error } = await supabase.from('roadmap_milestones').update({ enabled: !row.enabled }).eq('id', id);
  if (error) throw error; await fetchData(true);
  };

  return (
    <DataContext.Provider
      value={{
        events,
        eventCoordinators,
        galleryImages,
        sponsors,
        schedule,
        registrations,
        sponsorshipSettings,
        eventCategories,
        facultyHeads,
        coreCommittees,
        coreTeamMembers,
    sportsCommittees,
    sportsTeamMembers,
        bandMembers,
        guestArtists,
  chiefGuests,
        sponsorshipPackages,
        auditions,
        memberships,
        formSettings,
        socialMediaSettings,
        homepageSettings,
  siteSettings,
  aboutSettings,
  homeboundSettings,
  gallerySettings,
  roadmapMilestones,
        heroMedia,
        loading,
        connectionStatus,
        lastError,
  latencyMs,
  showConnectionBanner: connectionStatus !== 'ok' && !withinWarmup(),
    supabaseHost: SUPABASE_HOST,
    refreshAll: fetchData,
  resubscribeRealtime,
  prefetchEvents,
  prefetchGalleryImages,
        addEvent,
  addEventWithCoordinators,
  eventWinners,
    addEventWinner,
    updateEventWinner,
    deleteEventWinner,
    notifications,
  suppressPublicNotifications,
  setSuppressPublicNotifications,
    addNotification,
    updateNotification,
    deleteNotification,
        updateEvent,
      reorderEvents,
      reorderEventCategories,
        deleteEvent,
  addEventCoordinator,
  updateEventCoordinator,
  deleteEventCoordinator,
        toggleEventFeatured,
        toggleEventVisibility,
        toggleEventRegistration,
        addGalleryImage,
        updateGalleryImage,
        deleteGalleryImage,
        toggleGalleryImageFeatured,
        addSponsor,
        updateSponsor,
        deleteSponsor,
        toggleSponsorFeatured,
        addScheduleDay,
        updateScheduleDay,
        deleteScheduleDay,
        addScheduleEvent,
        updateScheduleEvent,
        deleteScheduleEvent,
        addRegistration,
        updateRegistrationStatus,
  bulkApproveRegistrations,
  bulkRejectRegistrations,
  bulkDeleteRegistrations,
        deleteRegistration,
        resetRegistrationIdSequence,
        updateSponsorshipSettings,
  addContactSection,
  updateContactSection,
  deleteContactSection,
        addEventCategory,
        updateEventCategory,
        deleteEventCategory,
        updateSocialMediaSettings,
        addFacultyHead,
        updateFacultyHead,
        deleteFacultyHead,
        toggleFacultyHeadEnabled,
        addCoreCommittee,
        updateCoreCommittee,
        deleteCoreCommittee,
  toggleCoreCommitteeEnabled,
        addCoreTeamMember,
        updateCoreTeamMember,
        deleteCoreTeamMember,
        toggleCoreTeamMemberEnabled,
        toggleCoreTeamMemberIsHead,
  // Sports
  addSportsCommittee,
  updateSportsCommittee,
  deleteSportsCommittee,
  toggleSportsCommitteeEnabled,
  addSportsTeamMember,
  updateSportsTeamMember,
  deleteSportsTeamMember,
  toggleSportsTeamMemberEnabled,
  toggleSportsTeamMemberIsHead,
        addBandMember,
        updateBandMember,
        deleteBandMember,
        toggleBandMemberEnabled,
        toggleBandMemberFeatured,
        addGuestArtist,
        updateGuestArtist,
        deleteGuestArtist,
        toggleGuestArtistEnabled,
        toggleGuestArtistFeatured,
  addChiefGuest,
  updateChiefGuest,
  deleteChiefGuest,
  toggleChiefGuestEnabled,
        addSponsorshipPackage,
        updateSponsorshipPackage,
        deleteSponsorshipPackage,
  toggleSponsorshipPackageEnabled,
        addAudition,
        updateAuditionStatus,
        deleteAudition,
        addMembership,
        updateMembershipStatus,
        deleteMembership,
        updateFormSettings,
        updateHomepageSettings,
  updateHomeboundSettings,
  updateSiteSettings,
  updateAboutSettings,
  updateGallerySettings,
  addRoadmapMilestone,
  updateRoadmapMilestone,
  deleteRoadmapMilestone,
  toggleRoadmapMilestoneEnabled,
        fetchHeroMedia,
        updateHeroMedia,
        schemaCapabilities,
        // Storage helpers
        getRegistrationPhotos,
        computeRegistrationPhotosUsage,
        deleteRegistrationPhoto,
        getBucketObjects,
        computeBucketUsage,
        deleteBucketObject,
        // Buckets + aggregate usage + quota
        listStorageBuckets,
        computeAllBucketsUsage,
        storageQuotaBytes,
        // Diagnostics
        pingNow,
  realtimeStatus,
        // Admin users
        adminUsers,
        refreshAdminUsers,
        addAdminUser,
        removeAdminUser,
      addAdminByEmail,
      createAdminAccount,
      updateAdminEmail,
          // Permissions
          myPermissions,
          listAdminPermissions,
          setAdminPermission,
    // Diagnostics for event reorder
    lastEventReorderError,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};



export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};