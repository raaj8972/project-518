import { createClient } from '@supabase/supabase-js'

// Supabase Cloud configuration
// Prefer environment variables from Vite; fall back to committed defaults
const supabaseUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co'
const supabaseAnonKey = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helpful for diagnostics
export const SUPABASE_HOST = (() => {
  try { return new URL(supabaseUrl).host } catch { return 'invalid-url' }
})()

// Database types
export interface Database {
  public: {
    Tables: {
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
          date: string
          time: string
          venue: string
          participants: string
          highlights: string[]
          rules: string[]
          registration_open: boolean
          max_participants: number | null
          current_registrations: number
          featured: boolean
          visible: boolean
          artist_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          category: string
          description: string
          image: string
          date: string
          time: string
          venue: string
          participants: string
          highlights: string[]
          rules?: string[]
          registration_open?: boolean
          max_participants?: number | null
          current_registrations?: number
          featured?: boolean
          visible?: boolean
          artist_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          category?: string
          description?: string
          image?: string
          date?: string
          time?: string
          venue?: string
          participants?: string
          highlights?: string[]
          rules?: string[]
          registration_open?: boolean
          max_participants?: number | null
          current_registrations?: number
          featured?: boolean
          visible?: boolean
          artist_id?: number | null
          created_at?: string
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
          motivation: string
          registration_date: string
          status: 'pending' | 'approved' | 'rejected'
          is_team_registration: boolean
          team_name: string | null
          team_members: any | null
          total_members: number
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
          motivation: string
          registration_date: string
          status?: 'pending' | 'approved' | 'rejected'
          is_team_registration: boolean
          team_name?: string | null
          team_members?: any | null
          total_members: number
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
          motivation?: string
          registration_date?: string
          status?: 'pending' | 'approved' | 'rejected'
          is_team_registration?: boolean
          team_name?: string | null
          team_members?: any | null
          total_members?: number
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
          sponsor_logos: any
          sponsor_section_enabled: boolean
          sponsor_section_text: string
          featured_partners_enabled: boolean
          show_faculty_heads: boolean
          show_committee_heads: boolean
          partners_carousel_speed_ms: number
          leadership_carousel_speed_ms: number
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
          sponsor_logos?: any
          sponsor_section_enabled?: boolean
          sponsor_section_text?: string
          featured_partners_enabled?: boolean
          show_faculty_heads?: boolean
          show_committee_heads?: boolean
          partners_carousel_speed_ms?: number
          leadership_carousel_speed_ms?: number
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
          sponsor_logos?: any
          sponsor_section_enabled?: boolean
          sponsor_section_text?: string
          featured_partners_enabled?: boolean
          show_faculty_heads?: boolean
          show_committee_heads?: boolean
          partners_carousel_speed_ms?: number
          leadership_carousel_speed_ms?: number
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
          description: string
          specialty: string
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
          title: string
          image: string
          video?: string | null
          description: string
          specialty: string
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
          title?: string
          image?: string
          video?: string | null
          description?: string
          specialty?: string
          achievements?: string[]
          order_position?: number
          enabled?: boolean
          is_featured?: boolean
          social_links?: any
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
    }
  }
}