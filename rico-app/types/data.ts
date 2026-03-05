import { supabase } from '../supabase';

// Helper to get the Row type from Supabase
type Row<T extends keyof any> = any; 

// Since we can't easily import the Database type from the web's lib/supabase.ts 
// (which has complex logic), we'll define the core interfaces directly to ensure 
// stability and type safety within the app.

export interface EventCategory {
  id: number;
  name: string;
  order_position: number;
  hex_identity?: string | null;
}

export interface Event {
  id: number;
  title: string;
  category: string;
  description: string;
  image: string;
  motion_poster_url: string | null;
  motion_poster_autoplay: boolean | null;
  coordinator_name: string | null;
  coordinator_phone: string | null;
  date: string;
  time: string;
  venue: string;
  participants: string;
  highlights: string[];
  rules: string[] | string;
  registration_open: boolean;
  registration_timer_enabled: boolean;
  registration_opens_at: string | null;
  team_max_members: number | null;
  team_min_members: number | null;
  registration_default_mode?: 'individual' | 'team' | null;
  registration_mode_locked?: boolean | null;
  registration_participant_types?: string[] | null;
  featured: boolean;
  visible: boolean;
  display_order: number;
  created_at: string;
}

export interface EventCoordinator {
  id: number;
  event_id: number;
  name: string;
  phone: string | null;
  order_position: number;
}

export interface ScheduleDay {
  id: number;
  date: string;
  day: string;
  title: string;
  events?: ScheduleEvent[];
  schedule_type?: 'prelims' | 'mains';
}

export interface ScheduleEvent {
  id: number;
  schedule_day_id: number;
  time: string;
  title: string;
  venue: string;
  type: string;
  duration: string;
  event_id?: number | null;
}

export interface GalleryImage {
  id: number;
  src: string;
  category: string;
  subcategory: string;
  title: string;
  year: string;
  featured: boolean;
}

export interface FacultyHead {
  id: number;
  name: string;
  title: string;
  image: string;
  description: string;
  achievements: string[];
  order_position: number;
  enabled: boolean;
  department?: string | null;
}

export interface CoreCommittee {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  order_position: number;
  enabled: boolean;
}

export interface CoreTeamMember {
  id: number;
  committee_id: number | null;
  name: string;
  role: string | null;
  image: string | null;
  is_head: boolean;
  order_position: number;
  enabled: boolean;
  description?: string | null;
  specialty?: string | null;
  social_links?: Record<string, string> | null;
  phone?: string | null;
  email?: string | null;
}

export interface Sponsor {
  id: number;
  name: string;
  category: string;
  logo: string;
  description: string;
  website: string | null;
  featured: boolean;
  order_position: number;
}

export interface HeroMedia {
  page_key: string;
  background_type: 'video' | 'image';
  video_url: string | null;
  image_url: string | null;
  mobile_video_url: string | null;
  mobile_image_url: string | null;
  poster_url: string | null;
  enabled: boolean;
}

export interface GuestArtist {
  id: number;
  name: string;
  title: string | null;
  image: string | null;
  card_media_url: string | null;
  card_media_is_video: boolean | null;
  is_featured: boolean | null;
  enabled: boolean;
  order_position: number | null;
  specialty: string | null;
  live_now_enabled: boolean | null;
  description: string | null;
  achievements: string[] | null;
  social_links: Record<string, string> | null;
  detail_music_url: string | null;
}

export interface EventWinner {
  id: number;
  name: string;
  position: number | null;
  category: string | null;
  year: string | null;
  event_id: number | null;
  photo_url: string | null;
  team_name?: string | null;
  registration_name?: string | null;
  is_team_registration?: boolean;
  event_title?: string | null;
  team_members?: any;
}

export interface RoadmapMilestone {
  id: number;
  title: string;
  description: string | null;
  date_label: string | null;
  status: 'completed' | 'current' | 'upcoming';
  order_position: number;
  enabled: boolean;
}

export interface AboutSettings {
  id: number;
  enabled: boolean;
  hero_heading: string | null;
  hero_paragraphs: string[] | null;
  stats: Array<{ value: string; label: string }> | null;
}

export interface SiteSettings {
  id: number;
  registration_participant_types?: string[];
  registration_institution_visible?: boolean;
  registration_institution_optional?: boolean;
  default_schedule_type?: 'prelims' | 'mains';
}

export interface Registration {
  id: string;
  event_id: number;
  event_title: string;
  full_name: string;
  email: string;
  phone: string;
  participant_type: string;
  is_team_registration: boolean;
  team_name: string | null;
  team_members: any | null;
  total_members: number;
  registration_date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BandMember {
  id: number;
  name: string;
  role: string | null;
  image: string | null;
  description: string | null;      // bio text
  specialty: string | null;
  category: string | null;
  achievements: string[] | null;
  social_links: { instagram?: string; [key: string]: string | undefined } | null;
  is_featured: boolean;
  enabled: boolean;
  order_position: number;
  created_at?: string;
  updated_at?: string;
}
