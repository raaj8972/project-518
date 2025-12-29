import { createClient } from '@supabase/supabase-js'

// Supabase Cloud configuration
// Prefer Vite env vars, but provide safe project defaults as a fallback so the app never "disconnects" if env is missing.
// Note: The anon key is safe to expose on the client; RLS still protects your data.
const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';

const { VITE_SUPABASE_URL: VITE_URL_RAW, VITE_SUPABASE_ANON_KEY: VITE_KEY_RAW } = import.meta.env as any;
const rawUrl = (VITE_URL_RAW || '').trim();
// Normalize URL: remove trailing slashes and trailing dots which can break DNS/TLS or CORS
const normalizedUrl = rawUrl.replace(/\/+$/, '').replace(/\.+$/, '');
let supabaseUrl = normalizedUrl || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = ((VITE_KEY_RAW || '') as string).trim() || DEFAULT_SUPABASE_ANON_KEY;

// If the site is served over HTTPS but the configured Supabase URL is HTTP, upgrade to HTTPS.
// This avoids mixed-content blocking and sporadic net::ERR_CONNECTION_CLOSED in some browsers/proxies.
try {
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    const u = new URL(supabaseUrl);
    if (u.protocol === 'http:') {
      u.protocol = 'https:';
      supabaseUrl = u.toString();
    }
  }
} catch {}

if (import.meta.env.DEV) {
  // Minimal diagnostics without leaking secrets
  const keyLen = supabaseAnonKey ? supabaseAnonKey.length : 0;
  // eslint-disable-next-line no-console
  if (((import.meta as any)?.env?.VITE_DEBUG_SUPABASE_LOGS === '1')) {
    console.info('[Supabase] env present:', { urlSet: !!supabaseUrl, keyLen });
  }
}

// Mark env as OK if either Vite env or safe defaults resolved a usable config
export const SUPABASE_ENV_OK = !!(supabaseUrl && supabaseAnonKey);
// If using defaults (i.e., Vite env missing), log an info once in dev for visibility
if (import.meta.env.DEV && (!VITE_URL_RAW || !VITE_KEY_RAW)) {
  // eslint-disable-next-line no-console
  if (((import.meta as any)?.env?.VITE_DEBUG_SUPABASE_LOGS === '1')) {
    console.info('[Supabase] Using built-in defaults for URL/key. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to override.');
  }
}

// Basic sanity checks to catch malformed inputs early in dev/prod logs
try {
  const url = new URL(supabaseUrl)
  if (!/^https?:$/.test(url.protocol)) {
    // eslint-disable-next-line no-console
    if (((import.meta as any)?.env?.VITE_DEBUG_SUPABASE_LOGS === '1')) {
      console.warn('[Supabase] Unexpected protocol in VITE_SUPABASE_URL:', url.protocol)
    }
  }
  if (!/\.supabase\.(co|in)$/.test(url.host)) {
    // eslint-disable-next-line no-console
    if (((import.meta as any)?.env?.VITE_DEBUG_SUPABASE_LOGS === '1')) {
      console.warn('[Supabase] Host does not look like a Supabase domain:', url.host)
    }
  }
} catch (e) {
  // eslint-disable-next-line no-console
  if (((import.meta as any)?.env?.VITE_DEBUG_SUPABASE_LOGS === '1')) {
    console.error('[Supabase] Invalid VITE_SUPABASE_URL. Check for stray spaces or trailing dot.', e)
  }
}

// Create the client from resolved values (env or safe defaults)
// Allow opting out of realtime in local dev to avoid noisy WSS failures (e.g., blocked by extensions
// or local network restrictions). To opt-in in dev, set VITE_SUPABASE_ENABLE_REALTIME=1.
const realtimeEnabled = (() => {
  try {
    const env = (import.meta as any).env || {};
    if (env.VITE_SUPABASE_ENABLE_REALTIME === '1') return true;
    // default: disable realtime in DEV to avoid wss issues while developing
    return !env.DEV;
  } catch {
    return true;
  }
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, ({
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use a stable, app-specific storage key to avoid collisions between previews/prod
    storageKey: 'ricorrenza_2025_auth',
  },
  realtime: {
    enabled: realtimeEnabled,
  }
} as any));

// Helpful for diagnostics
export const SUPABASE_HOST = (() => {
  try { return new URL(supabaseUrl).host } catch { return 'invalid-url' }
})()

// Database types
export interface Database {
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          user_id: string
          can_events: boolean
          can_schedule: boolean
          can_gallery: boolean
          can_sponsors: boolean
          can_registrations: boolean
          can_registration_photos: boolean
          can_faculty: boolean
          can_core_team: boolean
          can_sports: boolean
          can_guest_artists: boolean
          can_chief_guests: boolean
          can_homebound: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          can_events?: boolean
          can_schedule?: boolean
          can_gallery?: boolean
          can_sponsors?: boolean
          can_registrations?: boolean
          can_registration_photos?: boolean
          can_faculty?: boolean
          can_core_team?: boolean
          can_sports?: boolean
          can_guest_artists?: boolean
          can_chief_guests?: boolean
          can_homebound?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          can_events?: boolean
          can_schedule?: boolean
          can_gallery?: boolean
          can_sponsors?: boolean
          can_registrations?: boolean
          can_registration_photos?: boolean
          can_faculty?: boolean
          can_core_team?: boolean
          can_sports?: boolean
          can_guest_artists?: boolean
          can_chief_guests?: boolean
          can_homebound?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sports_committees: {
        Row: {
          id: number
          name: string
          description: string
          color: string
          order_position: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string
          color?: string
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string
          color?: string
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sports_team_members: {
        Row: {
          id: number
          committee_id: number | null
          name: string
          role: string
          image: string
          description: string
          achievements: string[]
          order_position: number
          enabled: boolean
          is_head: boolean
          phone: string | null
          social_links: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          committee_id?: number | null
          name: string
          role?: string
          image: string
          description?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_head?: boolean
          phone?: string | null
          social_links?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          committee_id?: number | null
          name?: string
          role?: string
          image?: string
          description?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_head?: boolean
          phone?: string | null
          social_links?: any
          created_at?: string
          updated_at?: string
        }
      }
      event_categories: {
        Row: {
          id: number
          name: string
          color: string
          description: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          color: string
          description: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          color?: string
          description?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: number
          title: string
          category: string
          description: string
          image: string
        motion_poster_url: string | null
        motion_poster_autoplay: boolean | null
          owner_hover_reveal: boolean | null
          coordinator_name: string | null
          coordinator_phone: string | null
          date: string
          time: string
          venue: string
          participants: string
          highlights: string[]
          rules: string[]
          registration_open: boolean
          registration_timer_enabled: boolean
          registration_opens_at: string | null
          team_max_members: number | null
          team_min_members: number | null
          max_participants: number | null
          current_registrations: number
          featured: boolean
          visible: boolean
          artist_id: number | null
          watch_live_url: string | null
          coordinator_password: string | null
          whatsapp_group_link: string | null
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          category: string
          description: string
          image: string
          motion_poster_url?: string | null
          motion_poster_autoplay?: boolean | null
          owner_hover_reveal?: boolean | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          date: string
          time: string
          venue: string
          participants: string
          highlights: string[]
          rules?: string[]
          registration_open?: boolean
          registration_timer_enabled?: boolean
          registration_opens_at?: string | null
          team_max_members?: number | null
          team_min_members?: number | null
          max_participants?: number | null
          current_registrations?: number
          featured?: boolean
          visible?: boolean
          artist_id?: number | null
          watch_live_url?: string | null
          coordinator_password?: string | null
          whatsapp_group_link?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          category?: string
          description?: string
          image?: string
          motion_poster_url?: string | null
          motion_poster_autoplay?: boolean | null
          owner_hover_reveal?: boolean | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          date?: string
          time?: string
          venue?: string
          participants?: string
          highlights?: string[]
          rules?: string[]
          registration_open?: boolean
          registration_timer_enabled?: boolean
          registration_opens_at?: string | null
          team_max_members?: number | null
          team_min_members?: number | null
          max_participants?: number | null
          current_registrations?: number
          featured?: boolean
          visible?: boolean
          artist_id?: number | null
          watch_live_url?: string | null
          coordinator_password?: string | null
          whatsapp_group_link?: string | null
          created_at?: string
        }
      }
      event_winners: {
        Row: {
          id: number
          event_id: number | null
          category: string | null
          registration_id: string | null
          position: number
          name: string
          year: string | null
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: number
          event_id?: number | null
          category?: string | null
          registration_id?: string | null
          position?: number
          name: string
          year?: string | null
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          event_id?: number | null
          category?: string | null
          registration_id?: string | null
          position?: number
          name?: string
          year?: string | null
          photo_url?: string | null
          created_at?: string
        }
      }
      event_coordinators: {
        Row: {
          id: number
          event_id: number
          name: string
          phone: string | null
          order_position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          event_id: number
          name: string
          phone?: string | null
          order_position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          event_id?: number
          name?: string
          phone?: string | null
          order_position?: number
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: number
          title: string | null
          message: string
          type: string
          link_url: string | null
          visible: boolean
          starts_at: string
          ends_at: string | null
          priority: number
          admin_only: boolean
          auto_dismiss_seconds: number | null
          text_color: string | null
          glow_color: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          title?: string | null
          message: string
          type?: string
          link_url?: string | null
          visible?: boolean
          starts_at?: string
          ends_at?: string | null
          priority?: number
          admin_only?: boolean
          auto_dismiss_seconds?: number | null
          text_color?: string | null
          glow_color?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          title?: string | null
          message?: string
          type?: string
          link_url?: string | null
          visible?: boolean
          starts_at?: string
          ends_at?: string | null
          priority?: number
          admin_only?: boolean
          auto_dismiss_seconds?: number | null
          text_color?: string | null
          glow_color?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      gallery_settings: {
        Row: {
          id: number
          scroll_per_item: number
          distance: number
          background_blur_px: number
          card_blur_max: number
          reveal_enabled: boolean
          reveal_duration_ms: number
          reveal_orientation: 'horizontal' | 'vertical'
          updated_at: string
        }
        Insert: {
          id?: number
          scroll_per_item?: number
          distance?: number
          background_blur_px?: number
          card_blur_max?: number
          reveal_enabled?: boolean
          reveal_duration_ms?: number
          reveal_orientation?: 'horizontal' | 'vertical'
          updated_at?: string
        }
        Update: {
          id?: number
          scroll_per_item?: number
          distance?: number
          background_blur_px?: number
          card_blur_max?: number
          reveal_enabled?: boolean
          reveal_duration_ms?: number
          reveal_orientation?: 'horizontal' | 'vertical'
          updated_at?: string
        }
      }
      gallery_images: {
        Row: {
          id: number
          src: string
          category: string
          title: string
          year: string
          featured: boolean
          created_at: string
        }
        Insert: {
          id?: number
          src: string
          category: string
          title: string
          year: string
          featured?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          src?: string
          category?: string
          title?: string
          year?: string
          featured?: boolean
          created_at?: string
        }
      }
      sponsors: {
        Row: {
          order_position: any
          featured: any
          id: number
          name: string
          category: string
          logo: string
          description: string
          website: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          category: string
          logo: string
          description: string
          website?: string | null
              order_position?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          category?: string
          logo?: string
          description?: string
          website?: string | null
          created_at?: string
        }
      }
      schedule_days: {
        Row: {
          id: number
          date: string
          day: string
          title: string
          created_at: string
        }
        Insert: {
          id?: number
          date: string
          day: string
          title: string
          created_at?: string
        }
        Update: {
          id?: number
          date?: string
          day?: string
          title?: string
          created_at?: string
        }
      }
      schedule_events: {
        Row: {
          id: number
          schedule_day_id: number
          time: string
          title: string
          venue: string
          type: string
          duration: string
          created_at: string
          event_id?: number | null
          guest_artist_id?: number | null
        }
        Insert: {
          id?: number
          schedule_day_id: number
          time: string
          title: string
          venue: string
          type: string
          duration: string
          created_at?: string
          event_id?: number | null
          guest_artist_id?: number | null
        }
        Update: {
          id?: number
          schedule_day_id?: number
          time?: string
          title?: string
          venue?: string
          type?: string
          duration?: string
          created_at?: string
          event_id?: number | null
          guest_artist_id?: number | null
        }
      }
      registrations: {
        Row: {
          id: string
          event_id: number
          event_title: string
          participant_type: string
          full_name: string
          email: string
          phone: string
          college: string
          registration_date: string
          status: 'pending' | 'approved' | 'rejected'
          is_team_registration: boolean
          team_name: string | null
          team_members: any | null
          total_members: number
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: number
          event_title: string
          participant_type: string
          full_name: string
          email: string
          phone: string
          college: string
          registration_date: string
          status?: 'pending' | 'approved' | 'rejected'
          is_team_registration: boolean
          team_name?: string | null
          team_members?: any | null
          total_members: number
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: number
          event_title?: string
          participant_type?: string
          full_name?: string
          email?: string
          phone?: string
          college?: string
          registration_date?: string
          status?: 'pending' | 'approved' | 'rejected'
          is_team_registration?: boolean
          team_name?: string | null
          team_members?: any | null
          total_members?: number
          photo_url?: string | null
          created_at?: string
        }
      }
      sponsorship_settings: {
        Row: {
          id: number
          brochure_url: string | null
          brochure_title: string
          intro_text: string
          call_to_action_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          brochure_url?: string | null
          brochure_title?: string
          intro_text?: string
          call_to_action_text?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          brochure_url?: string | null
          brochure_title?: string
          intro_text?: string
          call_to_action_text?: string
          created_at?: string
          updated_at?: string
        }
      }
      contact_sections: {
        Row: {
          id: number
          type: 'email' | 'phone' | 'address' | 'custom'
          title: string
          content: string
          icon: string
          enabled: boolean
          order: number
          sponsorship_settings_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          type: 'email' | 'phone' | 'address' | 'custom'
          title: string
          content: string
          icon?: string
          enabled?: boolean
          order?: number
          sponsorship_settings_id?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          type?: 'email' | 'phone' | 'address' | 'custom'
          title?: string
          content?: string
          icon?: string
          enabled?: boolean
          order?: number
          sponsorship_settings_id?: number
          created_at?: string
          updated_at?: string
        }
      }
      faculty_heads: {
        Row: {
          id: number
          name: string
          title: string
          image: string
          description: string
          achievements: string[]
          email: string | null
          phone: string | null
          order_position: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          title: string
          image: string
          description: string
          achievements?: string[]
          email?: string | null
          phone?: string | null
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          title?: string
          image?: string
          description?: string
          achievements?: string[]
          email?: string | null
          phone?: string | null
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      core_committees: {
        Row: {
          id: number
          name: string
          description: string
          color: string
          is_core: boolean
          order_position: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description: string
          color?: string
          is_core?: boolean
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string
          color?: string
          is_core?: boolean
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      core_team_members: {
        Row: {
          id: number
          committee_id: number
          name: string
          role: string
          image: string
          description: string
          specialty: string
          achievements: string[]
          order_position: number
          enabled: boolean
          is_head: boolean
          phone: string | null
          social_links: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          committee_id: number
          name: string
          role: string
          image: string
          description: string
          specialty: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_head?: boolean
          phone?: string | null
          social_links?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          committee_id?: number
          name?: string
          role?: string
          image?: string
          description?: string
          specialty?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_head?: boolean
          phone?: string | null
          social_links?: any
          created_at?: string
          updated_at?: string
        }
      }
      band_members: {
        Row: {
          id: number
          name: string
          role: string
          image: string
          description: string
          specialty: string
          category: string
          achievements: string[]
          order_position: number
          enabled: boolean
          is_featured: boolean
          social_links: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          role: string
          image: string
          description: string
          specialty: string
          category?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_featured?: boolean
          social_links?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          role?: string
          image?: string
          description?: string
          specialty?: string
          category?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_featured?: boolean
          social_links?: any
          created_at?: string
          updated_at?: string
        }
      }
      sponsorship_packages: {
        Row: {
          id: number
          tier: string
          price: string
          color: string
          icon: string
          benefits: string[]
          order_position: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          tier: string
          price: string
          color?: string
          icon?: string
          benefits?: string[]
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          tier?: string
          price?: string
          color?: string
          icon?: string
          benefits?: string[]
          order_position?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      homepage_settings: {
        Row: {
          id: number
          hero_media_url: string | null
          hero_media_type: 'image' | 'video'
          hero_title: string
          hero_subtitle: string
          hero_description: string
          // Branding
          brand_logo_url: string | null
          brand_year: number | null
          brand_logo_size_px: number | null
          brand_logo_glow_strength: number | null
          brand_logo_glow_color: string | null
          brand_logo_side: 'left' | 'right' | null
          brand_logo_offset_x_px: number | null
          brand_logo_offset_y_px: number | null
          brand_logo_offset_x_sm_px: number | null
          brand_logo_offset_y_sm_px: number | null
          brand_logo_offset_x_md_px: number | null
          brand_logo_offset_y_md_px: number | null
          brand_logo_offset_x_lg_px: number | null
          brand_logo_offset_y_lg_px: number | null
          sponsor_logos: any
          sponsor_section_enabled: boolean
          sponsor_section_text: string
          featured_partners_enabled: boolean
          show_faculty_heads: boolean
          show_committee_heads: boolean
          leadership_carousel_speed_ms: number
          sponsors_belt_speed_px_per_sec: number
          committee_marquee_speed_px_per_sec: number
          sponsors_belt_direction: 'left' | 'right'
          committee_marquee_direction: 'left' | 'right'
          // Instagram Videos
          instagram_trailer_url: string | null
          instagram_trailer_enabled: boolean
          instagram_trailer_title: string | null
          instagram_trailer_subtitle: string | null
          instagram_aftermovie_url: string | null
          instagram_aftermovie_enabled: boolean
          instagram_aftermovie_title: string | null
          instagram_aftermovie_subtitle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          hero_media_url?: string | null
          hero_media_type?: 'image' | 'video'
          hero_title?: string
          hero_subtitle?: string
          hero_description?: string
          // Branding
          brand_logo_url?: string | null
          brand_year?: number | null
          brand_logo_size_px?: number | null
          brand_logo_glow_strength?: number | null
          brand_logo_glow_color?: string | null
          brand_logo_side?: 'left' | 'right' | null
          brand_logo_offset_x_px?: number | null
          brand_logo_offset_y_px?: number | null
          brand_logo_offset_x_sm_px?: number | null
          brand_logo_offset_y_sm_px?: number | null
          brand_logo_offset_x_md_px?: number | null
          brand_logo_offset_y_md_px?: number | null
          brand_logo_offset_x_lg_px?: number | null
          brand_logo_offset_y_lg_px?: number | null
          sponsor_logos?: any
          sponsor_section_enabled?: boolean
          sponsor_section_text?: string
          featured_partners_enabled?: boolean
          show_faculty_heads?: boolean
          show_committee_heads?: boolean
          leadership_carousel_speed_ms?: number
          sponsors_belt_speed_px_per_sec?: number
          committee_marquee_speed_px_per_sec?: number
          sponsors_belt_direction?: 'left' | 'right'
          committee_marquee_direction?: 'left' | 'right'
          // Instagram Videos
          instagram_trailer_url?: string | null
          instagram_trailer_enabled?: boolean
          instagram_trailer_title?: string | null
          instagram_trailer_subtitle?: string | null
          instagram_aftermovie_url?: string | null
          instagram_aftermovie_enabled?: boolean
          instagram_aftermovie_title?: string | null
          instagram_aftermovie_subtitle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          hero_media_url?: string | null
          hero_media_type?: 'image' | 'video'
          hero_title?: string
          hero_subtitle?: string
          hero_description?: string
          // Branding
          brand_logo_url?: string | null
          brand_year?: number | null
          brand_logo_size_px?: number | null
          brand_logo_glow_strength?: number | null
          brand_logo_glow_color?: string | null
          brand_logo_side?: 'left' | 'right' | null
          brand_logo_offset_x_px?: number | null
          brand_logo_offset_y_px?: number | null
          brand_logo_offset_x_sm_px?: number | null
          brand_logo_offset_y_sm_px?: number | null
          brand_logo_offset_x_md_px?: number | null
          brand_logo_offset_y_md_px?: number | null
          brand_logo_offset_x_lg_px?: number | null
          brand_logo_offset_y_lg_px?: number | null
          sponsor_logos?: any
          sponsor_section_enabled?: boolean
          sponsor_section_text?: string
          featured_partners_enabled?: boolean
          show_faculty_heads?: boolean
          show_committee_heads?: boolean
          leadership_carousel_speed_ms?: number
          sponsors_belt_speed_px_per_sec?: number
          committee_marquee_speed_px_per_sec?: number
          sponsors_belt_direction?: 'left' | 'right'
          committee_marquee_direction?: 'left' | 'right'
          // Instagram Videos
          instagram_trailer_url?: string | null
          instagram_trailer_enabled?: boolean
          instagram_trailer_title?: string | null
          instagram_trailer_subtitle?: string | null
          instagram_aftermovie_url?: string | null
          instagram_aftermovie_enabled?: boolean
          instagram_aftermovie_title?: string | null
          instagram_aftermovie_subtitle?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      site_settings: {
        Row: {
          id: number
          site_closed: boolean
          coming_soon_enabled: boolean
          coming_soon_until: string | null
          coming_soon_title: string | null
          coming_soon_message: string | null
          coming_soon_ended_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          site_closed?: boolean
          coming_soon_enabled?: boolean
          coming_soon_until?: string | null
          coming_soon_title?: string | null
          coming_soon_message?: string | null
          coming_soon_ended_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          site_closed?: boolean
          coming_soon_enabled?: boolean
          coming_soon_until?: string | null
          coming_soon_title?: string | null
          coming_soon_message?: string | null
          coming_soon_ended_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hero_media: {
        Row: {
          id: number
          page_key: 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors'
          background_type: 'image' | 'video' | 'auto'
          image_url: string | null
          mobile_image_url?: string | null
          video_url: string | null
          poster_url: string | null
          overlay_color: string | null
          overlay_opacity: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          page_key: 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors'
          background_type?: 'image' | 'video' | 'auto'
          image_url?: string | null
          mobile_image_url?: string | null
          video_url?: string | null
          poster_url?: string | null
          overlay_color?: string | null
          overlay_opacity?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          page_key?: 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors'
          background_type?: 'image' | 'video' | 'auto'
          image_url?: string | null
          mobile_image_url?: string | null
          video_url?: string | null
          poster_url?: string | null
          overlay_color?: string | null
          overlay_opacity?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      guest_artists: {
        Row: {
          id: number
          name: string
          title: string
          image: string
          video: string | null
          video_url: string | null
          youtube_url: string | null
          watch_live_url: string | null
          detail_music_url: string | null
          card_media_url: string | null
          card_media_is_video: boolean | null
          description: string
          specialty: string
          achievements: string[]
          order_position: number
          enabled: boolean
          is_featured: boolean
          social_links: any
          performance_at: string | null
          venue: string | null
          countdown_enabled: boolean
          live_now_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          title: string
          image: string
          video?: string | null
          video_url?: string | null
          youtube_url?: string | null
          watch_live_url?: string | null
          coordinator_password?: string | null
          whatsapp_group_link?: string | null
          detail_music_url?: string | null
          card_media_url?: string | null
          card_media_is_video?: boolean | null
          description: string
          specialty: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_featured?: boolean
          social_links?: any
          performance_at?: string | null
          venue?: string | null
          countdown_enabled?: boolean
          live_now_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          title?: string
          image?: string
          video?: string | null
          video_url?: string | null
          youtube_url?: string | null
          watch_live_url?: string | null
          coordinator_password?: string | null
          whatsapp_group_link?: string | null
          detail_music_url?: string | null
          card_media_url?: string | null
          card_media_is_video?: boolean | null
          description?: string
          specialty?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_featured?: boolean
          social_links?: any
          performance_at?: string | null
          venue?: string | null
          countdown_enabled?: boolean
          live_now_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chief_guests: {
        Row: {
          id: number
          name: string
          title: string
          image: string
          description: string
          specialty: string | null
          achievements: string[]
          social_links: any
          enabled: boolean
          is_featured: boolean
          order_position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          title: string
          image: string
          description: string
          specialty?: string | null
            achievements?: string[]
          social_links?: any
          enabled?: boolean
          is_featured?: boolean
          order_position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          title?: string
          image?: string
          description?: string
          specialty?: string | null
          achievements?: string[]
          social_links?: any
          enabled?: boolean
          is_featured?: boolean
          order_position?: number
          created_at?: string
          updated_at?: string
        }
      }
      social_media_settings: {
        Row: {
          id: number
          instagramEnabled: boolean
          instagramUrl: string | null
          youtubeEnabled: boolean
          youtubeUrl: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          instagramEnabled?: boolean
          instagramUrl?: string | null
          youtubeEnabled?: boolean
          youtubeUrl?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          instagramEnabled?: boolean
          instagramUrl?: string | null
          youtubeEnabled?: boolean
          youtubeUrl?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      homebound_settings: {
        Row: {
          id: number
          instagram_url: string | null
          instagram_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          instagram_url?: string | null
          instagram_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          instagram_url?: string | null
          instagram_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      auditions: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string
         participant_type: string
          instrument_role: string
          experience_motivation: string
          portfolio_link: string | null
          status: 'pending' | 'reviewed' | 'contacted'
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone: string
         participant_type: string
          instrument_role: string
          experience_motivation?: string
          portfolio_link?: string | null
          status?: 'pending' | 'reviewed' | 'contacted'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string
         participant_type?: string
          instrument_role?: string
          experience_motivation?: string
          portfolio_link?: string | null
          status?: 'pending' | 'reviewed' | 'contacted'
          created_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string
         participant_type: string
          college_department: string
          motivation: string
          status: 'pending' | 'reviewed' | 'accepted'
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone: string
         participant_type: string
          college_department: string
          motivation?: string
          status?: 'pending' | 'reviewed' | 'accepted'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string
         participant_type?: string
          college_department?: string
          motivation?: string
          status?: 'pending' | 'reviewed' | 'accepted'
          created_at?: string
        }
      }
      form_settings: {
        Row: {
          id: number
          audition_form_enabled: boolean
          membership_form_enabled: boolean
          audition_form_message: string
          membership_form_message: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          audition_form_enabled?: boolean
          membership_form_enabled?: boolean
          audition_form_message?: string
          membership_form_message?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          audition_form_enabled?: boolean
          membership_form_enabled?: boolean
          audition_form_message?: string
          membership_form_message?: string
          created_at?: string
          updated_at?: string
        }
      }
      roadmap_milestones: {
        Row: {
          id: number
          year: number
          title: string | null
          points: string[]
          order_position: number
          enabled: boolean
          side: 'auto' | 'left' | 'right'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          year: number
          title?: string | null
          points?: string[]
          order_position?: number
          enabled?: boolean
          side?: 'auto' | 'left' | 'right'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          year?: number
          title?: string | null
          points?: string[]
          order_position?: number
          enabled?: boolean
          side?: 'auto' | 'left' | 'right'
          created_at?: string
          updated_at?: string
        }
      }
      security_users: {
        Row: {
          id: number
          username: string
          password_hash: string
          full_name: string
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          username: string
          password_hash: string
          full_name: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          username?: string
          password_hash?: string
          full_name?: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pass_registrations: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          created_at: string
          updated_at: string
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone: string
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
        }
      }
      entry_passes: {
        Row: {
          id: string
          pass_token: string
          pass_type: 'event_registration' | 'general_entry' | 'vip'
          event_registration_id: string | null
          pass_registration_id: string | null
          participant_name: string | null
          notes: string | null
          is_used: boolean
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          pass_token: string
          pass_type: 'event_registration' | 'general_entry' | 'vip'
          event_registration_id?: string | null
          pass_registration_id?: string | null
          participant_name?: string | null
          notes?: string | null
          is_used?: boolean
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          pass_token?: string
          pass_type?: 'event_registration' | 'general_entry' | 'vip'
          event_registration_id?: string | null
          pass_registration_id?: string | null
          participant_name?: string | null
          notes?: string | null
          is_used?: boolean
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      pass_scans: {
        Row: {
          id: number
          pass_id: string
          scanned_by_username: string
          scanned_at: string
          scan_result: 'valid' | 'already_used' | 'invalid' | 'inactive'
          participant_name: string | null
          pass_type: 'event_registration' | 'general_entry' | 'vip' | null
        }
        Insert: {
          id?: number
          pass_id: string
          scanned_by_username: string
          scanned_at?: string
          scan_result: 'valid' | 'already_used' | 'invalid' | 'inactive'
          participant_name?: string | null
          pass_type?: 'event_registration' | 'general_entry' | 'vip' | null
        }
        Update: {
          id?: number
          pass_id?: string
          scanned_by_username?: string
          scanned_at?: string
          scan_result?: 'valid' | 'already_used' | 'invalid' | 'inactive'
          participant_name?: string | null
          pass_type?: 'event_registration' | 'general_entry' | 'vip' | null
        }
      }
      security_settings: {
        Row: {
          id: number
          entry_pass_button_enabled: boolean
          event_dates: string[] | null
          updated_at: string
        }
        Insert: {
          id?: number
          entry_pass_button_enabled?: boolean
          event_dates?: string[] | null
          updated_at?: string
        }
        Update: {
          id?: number
          entry_pass_button_enabled?: boolean
          event_dates?: string[] | null
          updated_at?: string
        }
      }
      }
    }
  }