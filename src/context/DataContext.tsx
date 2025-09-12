import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

// Define types for your data based on Supabase schema
export type Event = Database['public']['Tables']['events']['Row'];
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
export type CoreTeamMember = Database['public']['Tables']['core_team_members']['Row'];
export type BandMember = Database['public']['Tables']['band_members']['Row'];
export type GuestArtist = Database['public']['Tables']['guest_artists']['Row'];
export type SponsorshipPackage = Database['public']['Tables']['sponsorship_packages']['Row'];
export type Audition = Database['public']['Tables']['auditions']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type FormSettings = Database['public']['Tables']['form_settings']['Row'];
export type SocialMediaSettings = Database['public']['Tables']['social_media_settings']['Row'];
export type HomepageSettings = Database['public']['Tables']['homepage_settings']['Row'];
export type HomeboundSettings = Database['public']['Tables']['homebound_settings']['Row'];
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
  galleryImages: GalleryImage[];
  sponsors: Sponsor[];  
  schedule: ScheduleDay[];
  registrations: Registration[];
  sponsorshipSettings: SponsorshipSettings | null;
  eventCategories: EventCategory[];
  facultyHeads: FacultyHead[];
  coreCommittees: CoreCommittee[];
  coreTeamMembers: CoreTeamMember[];
  bandMembers: BandMember[];
  guestArtists: GuestArtist[];
  sponsorshipPackages: SponsorshipPackage[];
  auditions: Audition[];
  memberships: Membership[];
  formSettings: FormSettings | null;
  socialMediaSettings: SocialMediaSettings | null;
  homepageSettings: HomepageSettings | null;
  homeboundSettings: HomeboundSettings | null;
  gallerySettings: GallerySettings | null;
  roadmapMilestones: RoadmapMilestone[];
  heroMedia: Partial<Record<PageKey, HeroMedia | null>>;
  loading: boolean;
  // Connection health
  connectionStatus: 'ok' | 'degraded' | 'offline';
  lastError: string | null;
  refreshAll: (silent?: boolean) => Promise<void>;
  addEvent: (event: Partial<Event>) => Promise<void>;
  updateEvent: (id: number, event: Partial<Event>) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  toggleEventFeatured: (id: number) => Promise<void>;
  toggleEventVisibility: (id: number) => Promise<void>;
  toggleEventRegistration: (id: number) => Promise<void>;
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
  deleteRegistration: (id: string) => Promise<void>;
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
  updateGallerySettings: (settings: Partial<GallerySettings>) => Promise<void>;
  addRoadmapMilestone: (m: Partial<RoadmapMilestone>) => Promise<void>;
  updateRoadmapMilestone: (id: number, m: Partial<RoadmapMilestone>) => Promise<void>;
  deleteRoadmapMilestone: (id: number) => Promise<void>;
  toggleRoadmapMilestoneEnabled: (id: number) => Promise<void>;
  fetchHeroMedia: (pageKey: PageKey) => Promise<HeroMedia | null>;
  updateHeroMedia: (pageKey: PageKey, patch: Partial<HeroMedia>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sponsorshipSettings, setSponsorshipSettings] = useState<SponsorshipSettings | null>(null);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [facultyHeads, setFacultyHeads] = useState<FacultyHead[]>([]);
  const [coreCommittees, setCoreCommittees] = useState<CoreCommittee[]>([]);
  const [coreTeamMembers, setCoreTeamMembers] = useState<CoreTeamMember[]>([]);
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);
  const [sponsorshipPackages, setSponsorshipPackages] = useState<SponsorshipPackage[]>([]);
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [socialMediaSettings, setSocialMediaSettings] = useState<SocialMediaSettings | null>(null);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [homeboundSettings, setHomeboundSettings] = useState<HomeboundSettings | null>(null);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(null);
  const [roadmapMilestones, setRoadmapMilestones] = useState<RoadmapMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroMedia, setHeroMedia] = useState<Partial<Record<PageKey, HeroMedia | null>>>({});
  const [connectionStatus, setConnectionStatus] = useState<'ok' | 'degraded' | 'offline'>('ok');
  const [lastError, setLastError] = useState<string | null>(null);

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
        const { error: pingError } = await supabase
          .from('events')
          .select('id', { head: true, count: 'exact' });
        if (pingError) {
          markErr('Supabase ping failed', pingError);
        }
      } catch (e) {
        markErr('Supabase ping threw', e);
      }
      // Fetch Events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*');
      if (eventsError) markErr('Error fetching events', eventsError);
      else setEvents(eventsData || []);

      // Fetch Gallery Images
      const { data: galleryImagesData, error: galleryImagesError } = await supabase
        .from('gallery_images')
        .select('*');
      if (galleryImagesError) markErr('Error fetching gallery images', galleryImagesError);
      else setGalleryImages(galleryImagesData || []);

      // Fetch Sponsors
      const { data: sponsorsData, error: sponsorsError } = await supabase
        .from('sponsors')
        .select('*');
      if (sponsorsError) markErr('Error fetching sponsors', sponsorsError);
      else setSponsors(sponsorsData || []);

      // Fetch Hero Media (all pages at once)
      const { data: heroMediaData, error: heroMediaError } = await supabase
        .from('hero_media')
        .select('*');
      if (heroMediaError) {
        markErr('Error fetching hero media', heroMediaError);
      } else {
        const map: Partial<Record<PageKey, HeroMedia | null>> = {};
        (heroMediaData || []).forEach((row) => {
          map[row.page_key as PageKey] = row as HeroMedia;
        });
        setHeroMedia(map);
      }

      // Fetch Schedule Days and Events
      const { data: scheduleDaysData, error: scheduleDaysError } = await supabase
        .from('schedule_days')
        .select(`
          *,
          schedule_events (
            id,
            time,
            title,
            venue,
            type,
            duration,
            created_at
          )
        `)
        .order('date', { ascending: true });
      if (scheduleDaysError) markErr('Error fetching schedule days', scheduleDaysError);
      else {
        // Transform the data to match our ScheduleDay type
        const transformedSchedule = (scheduleDaysData || []).map(day => ({
          ...day,
          events: day.schedule_events || []
        }));
        setSchedule(transformedSchedule);
      }

      // Fetch Registrations
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('registrations')
        .select('*');
      if (registrationsError) markErr('Error fetching registrations', registrationsError);
      else setRegistrations(registrationsData || []);

      // Fetch Sponsorship Settings and Contact Sections
      const { data: sponsorshipSettingsData, error: sponsorshipSettingsError } = await supabase
        .from('sponsorship_settings')
        .select('*, contact_sections (id, type, title, content, icon, enabled, "order")')
        .eq('id', 1)
        .single();
      if (sponsorshipSettingsError) markErr('Error fetching sponsorship settings', sponsorshipSettingsError);
      else {
        const settingsWithContactSections = {
          ...sponsorshipSettingsData,
          contactSections: sponsorshipSettingsData?.contact_sections || []
        } as SponsorshipSettings;
        setSponsorshipSettings(settingsWithContactSections);
      }

      // Fetch Event Categories
      const { data: eventCategoriesData, error: eventCategoriesError } = await supabase
        .from('event_categories')
        .select('*');
      if (eventCategoriesError) markErr('Error fetching event categories', eventCategoriesError);
      else setEventCategories(eventCategoriesData || []);

      // Fetch Faculty Heads
      const { data: facultyHeadsData, error: facultyHeadsError } = await supabase
        .from('faculty_heads')
        .select('*');
      if (facultyHeadsError) markErr('Error fetching faculty heads', facultyHeadsError);
      else setFacultyHeads(facultyHeadsData || []);

      // Fetch Core Committees
      const { data: coreCommitteesData, error: coreCommitteesError } = await supabase
        .from('core_committees')
        .select('*');
      if (coreCommitteesError) markErr('Error fetching core committees', coreCommitteesError);
      else setCoreCommittees(coreCommitteesData || []);

      // Fetch Core Team Members
      const { data: coreTeamMembersData, error: coreTeamMembersError } = await supabase
        .from('core_team_members')
        .select('*');
      if (coreTeamMembersError) markErr('Error fetching core team members', coreTeamMembersError);
      else setCoreTeamMembers(coreTeamMembersData || []);

      // Fetch Band Members
      const { data: bandMembersData, error: bandMembersError } = await supabase
        .from('band_members')
        .select('*');
      if (bandMembersError) markErr('Error fetching band members', bandMembersError);
      else setBandMembers(bandMembersData || []);

      // Fetch Guest Artists
      const { data: guestArtistsData, error: guestArtistsError } = await supabase
        .from('guest_artists')
        .select('*');
      if (guestArtistsError) markErr('Error fetching guest artists', guestArtistsError);
      else setGuestArtists(guestArtistsData || []);

      // Fetch Sponsorship Packages
      const { data: sponsorshipPackagesData, error: sponsorshipPackagesError } = await supabase
        .from('sponsorship_packages')
        .select('*');
      if (sponsorshipPackagesError) markErr('Error fetching sponsorship packages', sponsorshipPackagesError);
      else setSponsorshipPackages(sponsorshipPackagesData || []);

      // Fetch Auditions
      const { data: auditionsData, error: auditionsError } = await supabase
        .from('auditions')
        .select('*');
      if (auditionsError) markErr('Error fetching auditions', auditionsError);
      else setAuditions(auditionsData || []);

      // Fetch Memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('memberships')
        .select('*');
      if (membershipsError) markErr('Error fetching memberships', membershipsError);
      else setMemberships(membershipsData || []);

      // Fetch Form Settings
      const { data: formSettingsData, error: formSettingsError } = await supabase
        .from('form_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (formSettingsError) markErr('Error fetching form settings', formSettingsError);
      else setFormSettings(formSettingsData || null);

      // Fetch Social Media Settings
      const { data: socialMediaSettingsData, error: socialMediaSettingsError } = await supabase
        .from('social_media_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (socialMediaSettingsError) markErr('Error fetching social media settings', socialMediaSettingsError);
      else setSocialMediaSettings(socialMediaSettingsData || null);

      // Fetch Homepage Settings
      const { data: homepageSettingsData, error: homepageSettingsError } = await supabase
        .from('homepage_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (homepageSettingsError) markErr('Error fetching homepage settings', homepageSettingsError);
      else setHomepageSettings(homepageSettingsData || null);

      // Fetch HomeBound Settings
      const { data: hbSettingsData, error: hbSettingsError } = await supabase
        .from('homebound_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (hbSettingsError) markErr('Error fetching homebound settings', hbSettingsError);
      else setHomeboundSettings(hbSettingsData || null);

      // Fetch Gallery Settings
      const { data: gallerySettingsData, error: gallerySettingsError } = await supabase
        .from('gallery_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (gallerySettingsError) {
        const msg = String((gallerySettingsError as any)?.message || '').toLowerCase();
        const code = (gallerySettingsError as any)?.code;
        // If the table doesn't exist in this project yet, apply safe defaults and do NOT mark as degraded
        if (code === 'PGRST205' || (msg.includes('could not find the table') && msg.includes('gallery_settings'))) {
          console.warn('[Data] gallery_settings table missing; using defaults');
          setGallerySettings(DEFAULT_GALLERY_SETTINGS);
        } else {
          markErr('Error fetching gallery settings', gallerySettingsError);
        }
      } else setGallerySettings(gallerySettingsData || null);

      // Fetch Roadmap Milestones
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmap_milestones')
        .select('*')
        .order('order_position', { ascending: true });
      if (roadmapError) markErr('Error fetching roadmap milestones', roadmapError);
      else setRoadmapMilestones(roadmapData || []);

    } catch (error) {
      markErr('Error in fetchData', error);
    } finally {
      // Determine connection status from aggregated errors
      if (hadErrors) {
        const offlineSignals = (lastError || '').toLowerCase();
        if (/failed to fetch|network|fetcherror|timeout|abort/.test(offlineSignals)) {
          setConnectionStatus('offline');
        } else {
          setConnectionStatus('degraded');
        }
      } else {
        setConnectionStatus('ok');
        setLastError(null);
      }
      if (!silent) setLoading(false);
    }
  };

  const fetchHeroMedia = async (pageKey: PageKey): Promise<HeroMedia | null> => {
    const { data, error } = await supabase
      .from('hero_media')
      .select('*')
      .eq('page_key', pageKey)
      .maybeSingle();
    if (error) {
      console.error('fetchHeroMedia error:', error);
      return null;
    }
    if (data) {
      setHeroMedia((prev) => ({ ...prev, [pageKey]: data as HeroMedia }));
    }
    return (data as HeroMedia) ?? null;
  };

  const updateHeroMedia = async (pageKey: PageKey, patch: Partial<HeroMedia>) => {
    // Do not allow updating page_key via patch
    const payload = { ...patch } as Partial<HeroMedia>;
    delete (payload as any).page_key;

    const { error } = await supabase
      .from('hero_media')
      .update(payload)
      .eq('page_key', pageKey);
    if (error) throw error;

    // Refresh local cache
    await fetchHeroMedia(pageKey);
  };

  useEffect(() => {
    // Initial bootstrap should show loading state
    fetchData(false);
  }, []);

  // Refetch after authentication changes (e.g., RLS allows more rows when logged in)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Auth refreshes should be silent to avoid UI resets
      fetchData(true);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // Realtime subscription for roadmap milestones so roadmap updates instantly
  useEffect(() => {
    const channel = supabase
      .channel('ctx-roadmap-milestones')
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
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, []);

  // Realtime: keep form_settings in sync so enable/disable reflects instantly
  useEffect(() => {
    const formChannel = supabase
      .channel('ctx-form-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<FormSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') setFormSettings(null);
          else if (payload.new) setFormSettings(payload.new as FormSettings);
        }
      })
      .subscribe();

    const homepageChannel = supabase
      .channel('ctx-homepage-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<HomepageSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') setHomepageSettings(null);
          else if (payload.new) setHomepageSettings(payload.new as HomepageSettings);
        }
      })
      .subscribe();

    const homeboundChannel = supabase
      .channel('ctx-homebound-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homebound_settings' }, (payload: any) => {
        const row = (payload.new || payload.old) as Partial<HomeboundSettings> | undefined;
        if (row && (row as any).id === 1) {
          if (payload.eventType === 'DELETE') setHomeboundSettings(null);
          else if (payload.new) setHomeboundSettings(payload.new as HomeboundSettings);
        }
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(formChannel); } catch {}
      try { supabase.removeChannel(homepageChannel); } catch {}
      try { supabase.removeChannel(homeboundChannel); } catch {}
    };
  }, []);

  // Event Management
  const addEvent = async (event: Partial<Event>) => {
    const { error } = await supabase.from('events').insert(event);
    if (error) throw error;
    await fetchData(true);
  };

  const updateEvent = async (id: number, event: Partial<Event>) => {
    const { error } = await supabase.from('events').update(event).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteEvent = async (id: number) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
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
    const { error } = await supabase.from('gallery_images').update(image).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteGalleryImage = async (id: number) => {
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) throw error;
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
    const { error } = await supabase.from('sponsors').insert(sponsor);
    if (error) throw error;
    await fetchData(true);
  };

  const updateSponsor = async (id: number, sponsor: Partial<Sponsor>) => {
    const { error } = await supabase.from('sponsors').update(sponsor).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteSponsor = async (id: number) => {
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
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
    const { error } = await supabase.from('schedule_events').insert({ ...event, schedule_day_id: dayId });
    if (error) throw error;
    await fetchData(true);
  };

  const updateScheduleEvent = async (id: number, event: Partial<ScheduleEvent>) => {
    const { error } = await supabase.from('schedule_events').update(event).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteScheduleEvent = async (id: number) => {
    const { error } = await supabase.from('schedule_events').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Registration Management
  const addRegistration = async (registration: Partial<Registration>) => {
    // Prefer server-side RPC to bypass RLS via SECURITY DEFINER
  const { error: rpcError } = await supabase.rpc('register_for_event', {
      p_id: registration.id ?? null,
      p_event_id: registration.event_id as number,
      p_event_title: registration.event_title as string,
      p_participant_type: registration.participant_type as string,
      p_full_name: registration.full_name as string,
      p_email: registration.email as string,
      p_phone: registration.phone as string,
  p_college: (registration.college as string) ?? '',
      p_motivation: (registration as any).motivation ?? '',
      p_registration_date: (registration as any).registration_date ?? null,
      p_is_team_registration: registration.is_team_registration as boolean,
      p_team_name: (registration as any).team_name ?? null,
      p_team_members: (registration as any).team_members ? JSON.stringify((registration as any).team_members) : null,
      p_total_members: (registration as any).total_members ?? 1,
    });
    if (rpcError) {
      // Fallback to direct insert in case RPC is not yet deployed
      const { error } = await supabase.from('registrations').insert(registration);
      if (error) throw error;
    }
    // Avoid client-side count updates; rely on DB triggers
    await fetchData(true);
  };

  const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('registrations').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteRegistration = async (id: string) => {
    const { error, data: deletedReg } = await supabase.from('registrations').delete().eq('id', id).select('*').single();
    if (error) throw error;
    if (deletedReg && deletedReg.event_id) {
      const event = events.find(e => e.id === deletedReg.event_id);
      if (event) {
        const newCount = Math.max(0, (event.current_registrations || 0) - (deletedReg.total_members || 1));
        await supabase.from('events').update({ current_registrations: newCount }).eq('id', event.id);
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
    const { error } = await supabase.from('event_categories').delete().eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Social Media Settings Management
  const updateSocialMediaSettings = async (settings: Partial<SocialMediaSettings>) => {
    const { error } = await supabase.from('social_media_settings').update(settings).eq('id', 1);
    if (error) throw error;
    await fetchData(true);
  };

  // Faculty Heads Management
  const addFacultyHead = async (head: Partial<FacultyHead>) => {
    const { error } = await supabase.from('faculty_heads').insert(head);
    if (error) throw error;
    await fetchData(true);
  };

  const updateFacultyHead = async (id: number, head: Partial<FacultyHead>) => {
    const { error } = await supabase.from('faculty_heads').update(head).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteFacultyHead = async (id: number) => {
    const { error } = await supabase.from('faculty_heads').delete().eq('id', id);
    if (error) throw error;
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
    const { error } = await supabase.from('core_team_members').insert(member);
    if (error) throw error;
    await fetchData(true);
  };

  const updateCoreTeamMember = async (id: number, member: Partial<CoreTeamMember>) => {
    const { error } = await supabase.from('core_team_members').update(member).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteCoreTeamMember = async (id: number) => {
    const { error } = await supabase.from('core_team_members').delete().eq('id', id);
    if (error) throw error;
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
    const { error } = await supabase.from('core_team_members').update({ is_head: !member.is_head }).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  // Band Members Management
  const addBandMember = async (member: Partial<BandMember>) => {
    const { error } = await supabase.from('band_members').insert(member);
    if (error) throw error;
    await fetchData(true);
  };

  const updateBandMember = async (id: number, member: Partial<BandMember>) => {
    const { error } = await supabase.from('band_members').update(member).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteBandMember = async (id: number) => {
    const { error } = await supabase.from('band_members').delete().eq('id', id);
    if (error) throw error;
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
    if (error) throw error;
    await fetchData(true);
  };

  const updateGuestArtist = async (id: number, artist: Partial<GuestArtist>) => {
    const { error } = await supabase.from('guest_artists').update(artist).eq('id', id);
    if (error) throw error;
    await fetchData(true);
  };

  const deleteGuestArtist = async (id: number) => {
    const { error } = await supabase.from('guest_artists').delete().eq('id', id);
    if (error) throw error;
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
    const { error } = await supabase.from('auditions').insert(audition);
    if (error) throw error;
  await fetchData(true);
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
    const { error } = await supabase.from('memberships').insert(membership);
    if (error) throw error;
  await fetchData(true);
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
    const { error } = await supabase
      .from('form_settings')
      .update(settings)
      .eq('id', 1);
    if (error) throw error;
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
    const { error } = await supabase
      .from('homepage_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  await fetchData(true);
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
        galleryImages,
        sponsors,
        schedule,
        registrations,
        sponsorshipSettings,
        eventCategories,
        facultyHeads,
        coreCommittees,
        coreTeamMembers,
        bandMembers,
        guestArtists,
        sponsorshipPackages,
        auditions,
        memberships,
        formSettings,
        socialMediaSettings,
        homepageSettings,
  homeboundSettings,
  gallerySettings,
  roadmapMilestones,
        heroMedia,
        loading,
        connectionStatus,
        lastError,
        refreshAll: fetchData,
        addEvent,
        updateEvent,
        deleteEvent,
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
        deleteRegistration,
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
  updateGallerySettings,
  addRoadmapMilestone,
  updateRoadmapMilestone,
  deleteRoadmapMilestone,
  toggleRoadmapMilestoneEnabled,
        fetchHeroMedia,
        updateHeroMedia,
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