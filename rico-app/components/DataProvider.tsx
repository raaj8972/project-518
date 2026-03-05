import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabase';
import { 
  Event, EventCoordinator, ScheduleDay, ScheduleEvent, 
  GalleryImage, FacultyHead, CoreCommittee, CoreTeamMember, Sponsor, Registration,
  HeroMedia, GuestArtist, EventWinner, RoadmapMilestone, AboutSettings, SiteSettings,
  EventCategory, BandMember
} from '../types/data';
import { fetchSupabaseBatch } from '../utils/dataUtils';
import { useAuth } from './AuthProvider';

interface FormSettings {
  id: number;
  audition_form_enabled: boolean;
  audition_form_message: string;
}

interface Audition {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  participant_type: string;
  instrument_role: string;
  experience_motivation: string;
  portfolio_link: string | null;
  status: 'pending' | 'reviewed' | 'contacted';
  created_at: string;
}

interface DataContextType {
  events: Event[];
  eventCategories: EventCategory[];
  eventCoordinators: EventCoordinator[];
  schedule: ScheduleDay[];
  galleryImages: GalleryImage[];
  facultyHeads: FacultyHead[];
  coreCommittees: CoreCommittee[];
  coreTeamMembers: CoreTeamMember[];
  sponsors: Sponsor[];
  bandMembers: BandMember[];
  registrations: Registration[];
  auditions: Audition[];
  formSettings: FormSettings | null;
  
  // Settings & Home screen specific
  heroMedia: HeroMedia[];
  guestArtists: GuestArtist[];
  eventWinners: EventWinner[];
  milestones: RoadmapMilestone[];
  aboutSettings: AboutSettings | null;
  siteSettings: SiteSettings | null;
  socialMediaSettings: { instagram?: string; youtube?: string } | null;

  loading: boolean;
  refreshAll: () => Promise<void>;
  addAudition: (data: Omit<Audition, 'id' | 'created_at' | 'status'> & { status?: string }) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [eventCoordinators, setEventCoordinators] = useState<EventCoordinator[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [facultyHeads, setFacultyHeads] = useState<FacultyHead[]>([]);
  const [coreCommittees, setCoreCommittees] = useState<CoreCommittee[]>([]);
  const [coreTeamMembers, setCoreTeamMembers] = useState<CoreTeamMember[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  const [heroMedia, setHeroMedia] = useState<HeroMedia[]>([]);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);
  const [eventWinners, setEventWinners] = useState<EventWinner[]>([]);
  const [milestones, setMilestones] = useState<RoadmapMilestone[]>([]);
  const [aboutSettings, setAboutSettings] = useState<AboutSettings | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [socialMediaSettings, setSocialMediaSettings] = useState<{ instagram?: string; youtube?: string } | null>(null);

  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        eventsRes, categoriesRes, coordsRes, scheduleRes, galleryRes, 
        facultyRes, committeeRes, teamRes, sponsorsRes, bandRes, registrationsRes,
        heroRes, guestsRes, winnersRes, milestonesRes, aboutRes, formSettingsRes, 
        auditionsRes, siteRes, socialRes
      ] = await Promise.all([
        fetchSupabaseBatch<Event>('events', { order: { column: 'display_order', ascending: true } }),
        fetchSupabaseBatch<EventCategory>('event_categories', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<EventCoordinator>('event_coordinators'),
        supabase.from('schedule_days').select('*, schedule_events (*)').order('date', { ascending: true }),
        fetchSupabaseBatch<GalleryImage>('gallery_images', { order: { column: 'created_at', ascending: false } }),
        fetchSupabaseBatch<FacultyHead>('faculty_heads', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<CoreCommittee>('core_committees', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<CoreTeamMember>('core_team_members', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<Sponsor>('sponsors', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<BandMember>('band_members', { order: { column: 'order_position', ascending: true } }),
        user ? fetchSupabaseBatch<Registration>('registrations', { order: { column: 'registration_date', ascending: false } }) : Promise.resolve({ data: [] as Registration[], error: null }),
        
        fetchSupabaseBatch<HeroMedia>('hero_media'),
        fetchSupabaseBatch<GuestArtist>('guest_artists', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<EventWinner>('event_winners', { order: { column: 'id', ascending: true } }),
        fetchSupabaseBatch<RoadmapMilestone>('roadmap_milestones', { order: { column: 'order_position', ascending: true } }),
        supabase.from('about_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('form_settings').select('*').eq('id', 1).maybeSingle(),
        user ? supabase.from('auditions').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] as Audition[], error: null }),
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('social_media_settings').select('*').eq('id', 1).maybeSingle()
      ]);

      if (!eventsRes.error) setEvents((eventsRes.data || []).filter(e => e && e.id));
      if (!categoriesRes.error) setEventCategories((categoriesRes.data || []).filter(c => c && c.id));
      if (!coordsRes.error) setEventCoordinators((coordsRes.data || []).filter(c => c && c.id));
      if (!scheduleRes.error) {
        const mapped = (scheduleRes.data || []).filter(Boolean).map((day: any) => ({
          ...day,
          events: (day.schedule_events || []).filter(Boolean)
        }));
        setSchedule(mapped);
      }
      if (!galleryRes.error) setGalleryImages((galleryRes.data || []).filter(i => i && i.id));
      if (!facultyRes.error) setFacultyHeads((facultyRes.data || []).filter(f => f && f.id));
      if (!committeeRes.error) setCoreCommittees((committeeRes.data || []).filter(c => c && c.id));
      if (!teamRes.error) setCoreTeamMembers((teamRes.data || []).filter(m => m && m.id));
      if (!sponsorsRes.error) setSponsors((sponsorsRes.data || []).filter(s => s && s.id));
      if (!bandRes.error) setBandMembers((bandRes.data || []).filter(b => b && b.id));
      if (!registrationsRes.error) setRegistrations((registrationsRes.data || []).filter(r => r && r.id));
      
      if (!heroRes.error) setHeroMedia((heroRes.data || []).filter(Boolean));
      if (!guestsRes.error) setGuestArtists((guestsRes.data || []).filter(a => a && a.id));
      if (!winnersRes.error) setEventWinners((winnersRes.data || []).filter(w => w && w.id));
      if (!milestonesRes.error) setMilestones((milestonesRes.data || []).filter(m => m && m.id));
      if (!formSettingsRes.error) setFormSettings(formSettingsRes.data as FormSettings);
      if (!auditionsRes.error) setAuditions((auditionsRes.data || []) as Audition[]);
      
      if (!aboutRes.error) setAboutSettings(aboutRes.data);
      if (!siteRes.error) setSiteSettings(siteRes.data);
      if (!socialRes.error && socialRes.data) {
        setSocialMediaSettings({
          instagram: socialRes.data.instagram_url || socialRes.data.instagram,
          youtube: socialRes.data.youtube_url || socialRes.data.youtube
        });
      }

    } catch (err) {
      console.error('[DataProvider] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAudition = async (data: any) => {
    try {
      const { error } = await supabase.from('auditions').insert([data]);
      if (error) throw error;
      await fetchData(); // Refresh list after submission
    } catch (err) {
      console.error('[DataProvider] Error adding audition:', err);
      throw err;
    }
  };

  const value: DataContextType = {
    events,
    eventCategories,
    eventCoordinators,
    schedule,
    galleryImages,
    facultyHeads,
    coreCommittees,
    coreTeamMembers,
    sponsors,
    bandMembers,
    registrations,
    auditions,
    formSettings,
    
    heroMedia,
    guestArtists,
    eventWinners,
    milestones,
    aboutSettings,
    siteSettings,
    socialMediaSettings,

    loading,
    refreshAll: fetchData,
    addAudition
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
