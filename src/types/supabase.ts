export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      about_settings: {
        Row: {
          enabled: boolean
          hero_heading: string | null
          hero_paragraphs: Json
          hero_title: string | null
          id: number
          stats: Json
          tracks: Json
          tracksLabel: string | null
          updated_at: string
          zones: Json
          zonesLabel: string | null
        }
        Insert: {
          enabled?: boolean
          hero_heading?: string | null
          hero_paragraphs?: Json
          hero_title?: string | null
          id?: number
          stats?: Json
          tracks?: Json
          tracksLabel?: string | null
          updated_at?: string
          zones?: Json
          zonesLabel?: string | null
        }
        Update: {
          enabled?: boolean
          hero_heading?: string | null
          hero_paragraphs?: Json
          hero_title?: string | null
          id?: number
          stats?: Json
          tracks?: Json
          tracksLabel?: string | null
          updated_at?: string
          zones?: Json
          zonesLabel?: string | null
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: number
          message: string
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: number
          message: string
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: number
          message?: string
          to_user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          can_chief_guests: boolean
          can_core_team: boolean
          can_events: boolean
          can_faculty: boolean
          can_gallery: boolean
          can_guest_artists: boolean
          can_homebound: boolean
          can_registration_photos: boolean
          can_registrations: boolean
          can_schedule: boolean
          can_security_passes: boolean
          can_sponsors: boolean
          can_sports: boolean
          created_at: string
          email: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_chief_guests?: boolean
          can_core_team?: boolean
          can_events?: boolean
          can_faculty?: boolean
          can_gallery?: boolean
          can_guest_artists?: boolean
          can_homebound?: boolean
          can_registration_photos?: boolean
          can_registrations?: boolean
          can_schedule?: boolean
          can_security_passes?: boolean
          can_sponsors?: boolean
          can_sports?: boolean
          created_at?: string
          email?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_chief_guests?: boolean
          can_core_team?: boolean
          can_events?: boolean
          can_faculty?: boolean
          can_gallery?: boolean
          can_guest_artists?: boolean
          can_homebound?: boolean
          can_registration_photos?: boolean
          can_registrations?: boolean
          can_schedule?: boolean
          can_security_passes?: boolean
          can_sponsors?: boolean
          can_sports?: boolean
          created_at?: string
          email?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_presence: {
        Row: {
          current_page: string | null
          email: string | null
          id: number
          last_activity_at: string | null
          user_id: string
        }
        Insert: {
          current_page?: string | null
          email?: string | null
          id?: number
          last_activity_at?: string | null
          user_id: string
        }
        Update: {
          current_page?: string | null
          email?: string | null
          id?: number
          last_activity_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          _diag_email: string | null
          _diag_role: string | null
          _updated_at: string | null
          id: string
          ip_address: string | null
          last_seen_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          _diag_email?: string | null
          _diag_role?: string | null
          _updated_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          _diag_email?: string | null
          _diag_role?: string | null
          _updated_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          approval_enabled_at: string | null
          approval_enabled_by: string | null
          created_at: string | null
          display_name: string | null
          email: string
          is_primary: boolean | null
          requires_approval: boolean | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_enabled_at?: string | null
          approval_enabled_by?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          is_primary?: boolean | null
          requires_approval?: boolean | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_enabled_at?: string | null
          approval_enabled_by?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          is_primary?: boolean | null
          requires_approval?: boolean | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      allowed_admins: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          permissions: Json | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          permissions?: Json | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          permissions?: Json | null
          role?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          event_id: string | null
          id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["sender_role_type"]
          target: Database["public"]["Enums"]["announcement_target"]
          text: string
          updated_at: string
          urgent: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          sender_id: string
          sender_role?: Database["public"]["Enums"]["sender_role_type"]
          target?: Database["public"]["Enums"]["announcement_target"]
          text: string
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["sender_role_type"]
          target?: Database["public"]["Enums"]["announcement_target"]
          text?: string
          updated_at?: string
          urgent?: boolean
        }
        Relationships: []
      }
      annual_sports_events: {
        Row: {
          auction_status: string | null
          category: string | null
          created_at: string | null
          custom_fields: Json | null
          description: string | null
          display_schedule: boolean | null
          display_teams: boolean | null
          fee: number | null
          id: string
          image_url: string | null
          max_participants: number | null
          min_participants: number | null
          name: string
          registration_closes_at: string | null
          registration_default_mode: string | null
          registration_limit: number | null
          registration_mode_locked: boolean | null
          registration_open: boolean | null
          registration_opens_at: string | null
          registration_participant_quotas: Json | null
          registration_participant_types: string[] | null
          registration_timer_enabled: boolean | null
          require_leader_photo: boolean | null
          require_player_photo: boolean | null
          require_team_individual_photos: boolean | null
          require_team_photo: boolean | null
          rules_url: string | null
          team_max_members: number | null
          team_min_members: number | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          auction_status?: string | null
          category?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          display_schedule?: boolean | null
          display_teams?: boolean | null
          fee?: number | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          min_participants?: number | null
          name: string
          registration_closes_at?: string | null
          registration_default_mode?: string | null
          registration_limit?: number | null
          registration_mode_locked?: boolean | null
          registration_open?: boolean | null
          registration_opens_at?: string | null
          registration_participant_quotas?: Json | null
          registration_participant_types?: string[] | null
          registration_timer_enabled?: boolean | null
          require_leader_photo?: boolean | null
          require_player_photo?: boolean | null
          require_team_individual_photos?: boolean | null
          require_team_photo?: boolean | null
          rules_url?: string | null
          team_max_members?: number | null
          team_min_members?: number | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          auction_status?: string | null
          category?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          display_schedule?: boolean | null
          display_teams?: boolean | null
          fee?: number | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          min_participants?: number | null
          name?: string
          registration_closes_at?: string | null
          registration_default_mode?: string | null
          registration_limit?: number | null
          registration_mode_locked?: boolean | null
          registration_open?: boolean | null
          registration_opens_at?: string | null
          registration_participant_quotas?: Json | null
          registration_participant_types?: string[] | null
          registration_timer_enabled?: boolean | null
          require_leader_photo?: boolean | null
          require_player_photo?: boolean | null
          require_team_individual_photos?: boolean | null
          require_team_photo?: boolean | null
          rules_url?: string | null
          team_max_members?: number | null
          team_min_members?: number | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      annual_sports_matches: {
        Row: {
          created_at: string | null
          event_id: string | null
          highlights: string | null
          id: number
          match_date: string | null
          match_time: string | null
          round: string | null
          score_a: string | null
          score_b: string | null
          status: string | null
          team_a_registration_id: string | null
          team_b_registration_id: string | null
          updated_at: string | null
          venue: string | null
          winner_registration_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          highlights?: string | null
          id?: number
          match_date?: string | null
          match_time?: string | null
          round?: string | null
          score_a?: string | null
          score_b?: string | null
          status?: string | null
          team_a_registration_id?: string | null
          team_b_registration_id?: string | null
          updated_at?: string | null
          venue?: string | null
          winner_registration_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          highlights?: string | null
          id?: number
          match_date?: string | null
          match_time?: string | null
          round?: string | null
          score_a?: string | null
          score_b?: string | null
          status?: string | null
          team_a_registration_id?: string | null
          team_b_registration_id?: string | null
          updated_at?: string | null
          venue?: string | null
          winner_registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "annual_sports_matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_sports_matches_team_a_registration_id_fkey"
            columns: ["team_a_registration_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_sports_matches_team_b_registration_id_fkey"
            columns: ["team_b_registration_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_sports_matches_winner_registration_id_fkey"
            columns: ["winner_registration_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_sports_registrations: {
        Row: {
          college: string | null
          created_at: string | null
          department: string | null
          email: string | null
          event_id: string | null
          full_name: string | null
          id: string
          is_team_registration: boolean | null
          metadata: Json | null
          participant_type: string | null
          phone: string | null
          photo_url: string | null
          reg_id: string | null
          roll_no: string | null
          status: string | null
          team_id: string | null
          team_members: Json | null
          team_name: string | null
          total_members: number | null
          updated_at: string | null
          user_id: string | null
          year: string | null
        }
        Insert: {
          college?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          event_id?: string | null
          full_name?: string | null
          id?: string
          is_team_registration?: boolean | null
          metadata?: Json | null
          participant_type?: string | null
          phone?: string | null
          photo_url?: string | null
          reg_id?: string | null
          roll_no?: string | null
          status?: string | null
          team_id?: string | null
          team_members?: Json | null
          team_name?: string | null
          total_members?: number | null
          updated_at?: string | null
          user_id?: string | null
          year?: string | null
        }
        Update: {
          college?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          event_id?: string | null
          full_name?: string | null
          id?: string
          is_team_registration?: boolean | null
          metadata?: Json | null
          participant_type?: string | null
          phone?: string | null
          photo_url?: string | null
          reg_id?: string | null
          roll_no?: string | null
          status?: string | null
          team_id?: string | null
          team_members?: Json | null
          team_name?: string | null
          total_members?: number | null
          updated_at?: string | null
          user_id?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "annual_sports_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_sports_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      auditions: {
        Row: {
          created_at: string | null
          email: string
          experience_motivation: string | null
          full_name: string
          id: string
          instrument_role: string
          participant_type: string
          phone: string
          portfolio_link: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          experience_motivation?: string | null
          full_name: string
          id?: string
          instrument_role: string
          participant_type?: string
          phone: string
          portfolio_link?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          experience_motivation?: string | null
          full_name?: string
          id?: string
          instrument_role?: string
          participant_type?: string
          phone?: string
          portfolio_link?: string | null
          status?: string | null
        }
        Relationships: []
      }
      band_members: {
        Row: {
          achievements: string[] | null
          category: string
          created_at: string | null
          description: string
          enabled: boolean | null
          id: number
          image: string
          is_featured: boolean | null
          name: string
          order_position: number | null
          role: string
          social_links: Json | null
          specialty: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string[] | null
          category?: string
          created_at?: string | null
          description: string
          enabled?: boolean | null
          id?: number
          image: string
          is_featured?: boolean | null
          name: string
          order_position?: number | null
          role: string
          social_links?: Json | null
          specialty: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string[] | null
          category?: string
          created_at?: string | null
          description?: string
          enabled?: boolean | null
          id?: number
          image?: string
          is_featured?: boolean | null
          name?: string
          order_position?: number | null
          role?: string
          social_links?: Json | null
          specialty?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      biometric_profiles: {
        Row: {
          biometric_enabled: boolean
          created_at: string
          credential_id: string | null
          enrolled_at: string | null
          face_enrolled: boolean
          failed_attempts: number
          fingerprint_enrolled: boolean
          last_auth_at: string | null
          public_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          biometric_enabled?: boolean
          created_at?: string
          credential_id?: string | null
          enrolled_at?: string | null
          face_enrolled?: boolean
          failed_attempts?: number
          fingerprint_enrolled?: boolean
          last_auth_at?: string | null
          public_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          biometric_enabled?: boolean
          created_at?: string
          credential_id?: string | null
          enrolled_at?: string | null
          face_enrolled?: boolean
          failed_attempts?: number
          fingerprint_enrolled?: boolean
          last_auth_at?: string | null
          public_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          expires_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["sender_role_type"]
          text: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          expires_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["sender_role_type"]
          text: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["sender_role_type"]
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chief_guests: {
        Row: {
          achievements: string[]
          created_at: string
          description: string
          enabled: boolean
          id: number
          image: string
          is_featured: boolean
          name: string
          order_position: number
          social_links: Json
          specialty: string | null
          title: string
          updated_at: string
        }
        Insert: {
          achievements?: string[]
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          image?: string
          is_featured?: boolean
          name: string
          order_position?: number
          social_links?: Json
          specialty?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          achievements?: string[]
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          image?: string
          is_featured?: boolean
          name?: string
          order_position?: number
          social_links?: Json
          specialty?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_sections: {
        Row: {
          content: string
          created_at: string | null
          enabled: boolean | null
          icon: string
          id: number
          order: number
          sponsorship_settings_id: number
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          enabled?: boolean | null
          icon?: string
          id?: number
          order?: number
          sponsorship_settings_id?: number
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          enabled?: boolean | null
          icon?: string
          id?: number
          order?: number
          sponsorship_settings_id?: number
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_sections_sponsorship_settings_id_fkey"
            columns: ["sponsorship_settings_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          coordinator_id: string | null
          created_at: string
          event_id: string | null
          id: string
          student_id: string
        }
        Insert: {
          coordinator_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          student_id: string
        }
        Update: {
          coordinator_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          student_id?: string
        }
        Relationships: []
      }
      core_committees: {
        Row: {
          color: string
          created_at: string
          description: string
          enabled: boolean
          id: number
          is_core: boolean
          name: string
          order_position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description: string
          enabled?: boolean
          id?: number
          is_core?: boolean
          name: string
          order_position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          is_core?: boolean
          name?: string
          order_position?: number
          updated_at?: string
        }
        Relationships: []
      }
      core_team_members: {
        Row: {
          achievements: string[]
          color: string | null
          committee_id: number | null
          created_at: string
          description: string | null
          enabled: boolean
          id: number
          image: string | null
          is_council: boolean
          is_head: boolean | null
          name: string | null
          order_position: number
          phone: string | null
          role: string | null
          social_links: Json | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          achievements?: string[]
          color?: string | null
          committee_id?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: number
          image?: string | null
          is_council?: boolean
          is_head?: boolean | null
          name?: string | null
          order_position?: number
          phone?: string | null
          role?: string | null
          social_links?: Json | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: string[]
          color?: string | null
          committee_id?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: number
          image?: string | null
          is_council?: boolean
          is_head?: boolean | null
          name?: string | null
          order_position?: number
          phone?: string | null
          role?: string | null
          social_links?: Json | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_team_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "core_committees"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          id: string
          metadata: Json | null
          recipient_email: string
          registration_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          metadata?: Json | null
          recipient_email: string
          registration_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string
          registration_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_passes: {
        Row: {
          barcode_type: string | null
          batch_id: string | null
          created_at: string
          created_by: string | null
          day_number: number | null
          event_registration_id: string | null
          event_title: string | null
          id: string
          is_active: boolean
          is_hidden_from_council: boolean | null
          is_used: boolean
          notes: string | null
          participant_name: string | null
          pass_color: string | null
          pass_notes: string | null
          pass_registration_id: string | null
          pass_token: string
          pass_type: string
          registration_id: string | null
          scanned_at: string | null
          scanned_by: string | null
          student_name: string | null
          used_at: string | null
          user_id: string | null
          valid_date: string | null
          venue: string | null
        }
        Insert: {
          barcode_type?: string | null
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          day_number?: number | null
          event_registration_id?: string | null
          event_title?: string | null
          id?: string
          is_active?: boolean
          is_hidden_from_council?: boolean | null
          is_used?: boolean
          notes?: string | null
          participant_name?: string | null
          pass_color?: string | null
          pass_notes?: string | null
          pass_registration_id?: string | null
          pass_token: string
          pass_type?: string
          registration_id?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          student_name?: string | null
          used_at?: string | null
          user_id?: string | null
          valid_date?: string | null
          venue?: string | null
        }
        Update: {
          barcode_type?: string | null
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          day_number?: number | null
          event_registration_id?: string | null
          event_title?: string | null
          id?: string
          is_active?: boolean
          is_hidden_from_council?: boolean | null
          is_used?: boolean
          notes?: string | null
          participant_name?: string | null
          pass_color?: string | null
          pass_notes?: string | null
          pass_registration_id?: string | null
          pass_token?: string
          pass_type?: string
          registration_id?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          student_name?: string | null
          used_at?: string | null
          user_id?: string | null
          valid_date?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_passes_event_registration_id_fkey"
            columns: ["event_registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_passes_pass_registration_id_fkey"
            columns: ["pass_registration_id"]
            isOneToOne: false
            referencedRelation: "pass_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_passes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          color: string
          created_at: string | null
          description: string
          id: number
          name: string
          order_position: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          description: string
          id?: number
          name: string
          order_position?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string
          id?: number
          name?: string
          order_position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_coordinators: {
        Row: {
          created_at: string | null
          email: string | null
          event_id: string | null
          id: string
          is_primary: boolean | null
          name: string
          order_position: number | null
          phone: string
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          order_position?: number | null
          phone: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          order_position?: number | null
          phone?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_coordinators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_winners: {
        Row: {
          category: string | null
          created_at: string
          event_id: string | null
          id: number
          name: string
          photo_url: string | null
          position: number
          registration_id: string | null
          year: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_id?: string | null
          id?: never
          name: string
          photo_url?: string | null
          position: number
          registration_id?: string | null
          year?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_id?: string | null
          id?: never
          name?: string
          photo_url?: string | null
          position?: number
          registration_id?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_winners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_winners_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          coordinator_name: string | null
          coordinator_password: string | null
          coordinator_phone: string | null
          created_at: string | null
          current_registrations: number | null
          date: string | null
          description: string
          display_order: number | null
          featured: boolean | null
          highlights: string[]
          id: string
          image: string
          max_participants: number | null
          motion_poster_autoplay: boolean | null
          motion_poster_url: string | null
          owner_hover_reveal: boolean | null
          participants: string
          payment_amount: number | null
          payment_gateway_config: Json | null
          prefer_video: boolean | null
          registration_closes_at: string | null
          registration_default_mode: string | null
          registration_form_fields: Json | null
          registration_mode_locked: boolean | null
          registration_open: boolean | null
          registration_opens_at: string | null
          registration_participant_quotas: Json | null
          registration_participant_types: string[] | null
          registration_photo_label: string | null
          registration_photo_required: boolean | null
          registration_timer_enabled: boolean | null
          rules: string[] | null
          rules_link: string | null
          team_max_members: number | null
          team_min_members: number | null
          team_required_size: number | null
          time: string | null
          title: string
          updated_at: string | null
          venue: string | null
          visible: boolean | null
          watch_live_url: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          category: string
          coordinator_name?: string | null
          coordinator_password?: string | null
          coordinator_phone?: string | null
          created_at?: string | null
          current_registrations?: number | null
          date?: string | null
          description: string
          display_order?: number | null
          featured?: boolean | null
          highlights?: string[]
          id?: string
          image: string
          max_participants?: number | null
          motion_poster_autoplay?: boolean | null
          motion_poster_url?: string | null
          owner_hover_reveal?: boolean | null
          participants: string
          payment_amount?: number | null
          payment_gateway_config?: Json | null
          prefer_video?: boolean | null
          registration_closes_at?: string | null
          registration_default_mode?: string | null
          registration_form_fields?: Json | null
          registration_mode_locked?: boolean | null
          registration_open?: boolean | null
          registration_opens_at?: string | null
          registration_participant_quotas?: Json | null
          registration_participant_types?: string[] | null
          registration_photo_label?: string | null
          registration_photo_required?: boolean | null
          registration_timer_enabled?: boolean | null
          rules?: string[] | null
          rules_link?: string | null
          team_max_members?: number | null
          team_min_members?: number | null
          team_required_size?: number | null
          time?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
          visible?: boolean | null
          watch_live_url?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          category?: string
          coordinator_name?: string | null
          coordinator_password?: string | null
          coordinator_phone?: string | null
          created_at?: string | null
          current_registrations?: number | null
          date?: string | null
          description?: string
          display_order?: number | null
          featured?: boolean | null
          highlights?: string[]
          id?: string
          image?: string
          max_participants?: number | null
          motion_poster_autoplay?: boolean | null
          motion_poster_url?: string | null
          owner_hover_reveal?: boolean | null
          participants?: string
          payment_amount?: number | null
          payment_gateway_config?: Json | null
          prefer_video?: boolean | null
          registration_closes_at?: string | null
          registration_default_mode?: string | null
          registration_form_fields?: Json | null
          registration_mode_locked?: boolean | null
          registration_open?: boolean | null
          registration_opens_at?: string | null
          registration_participant_quotas?: Json | null
          registration_participant_types?: string[] | null
          registration_photo_label?: string | null
          registration_photo_required?: boolean | null
          registration_timer_enabled?: boolean | null
          rules?: string[] | null
          rules_link?: string | null
          team_max_members?: number | null
          team_min_members?: number | null
          team_required_size?: number | null
          time?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
          visible?: boolean | null
          watch_live_url?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      faculty_heads: {
        Row: {
          achievements: string[] | null
          created_at: string | null
          description: string
          email: string | null
          enabled: boolean | null
          id: number
          image: string
          name: string
          order_position: number | null
          phone: string | null
          social_links: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string[] | null
          created_at?: string | null
          description: string
          email?: string | null
          enabled?: boolean | null
          id?: never
          image: string
          name: string
          order_position?: number | null
          phone?: string | null
          social_links?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string[] | null
          created_at?: string | null
          description?: string
          email?: string | null
          enabled?: boolean | null
          id?: never
          image?: string
          name?: string
          order_position?: number | null
          phone?: string | null
          social_links?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      form_settings: {
        Row: {
          audition_form_enabled: boolean | null
          audition_form_message: string | null
          created_at: string | null
          id: number
          membership_form_enabled: boolean | null
          membership_form_message: string | null
          updated_at: string | null
        }
        Insert: {
          audition_form_enabled?: boolean | null
          audition_form_message?: string | null
          created_at?: string | null
          id?: number
          membership_form_enabled?: boolean | null
          membership_form_message?: string | null
          updated_at?: string | null
        }
        Update: {
          audition_form_enabled?: boolean | null
          audition_form_message?: string | null
          created_at?: string | null
          id?: number
          membership_form_enabled?: boolean | null
          membership_form_message?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_faces: {
        Row: {
          bounds: Json
          created_at: string | null
          embedding: string
          id: string
          image_id: number | null
        }
        Insert: {
          bounds: Json
          created_at?: string | null
          embedding: string
          id?: string
          image_id?: number | null
        }
        Update: {
          bounds?: Json
          created_at?: string | null
          embedding?: string
          id?: string
          image_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_faces_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          category: string
          created_at: string | null
          faces_indexed: boolean | null
          featured: boolean | null
          id: number
          src: string
          subcategory: string
          title: string
          updated_at: string | null
          year: string
        }
        Insert: {
          category: string
          created_at?: string | null
          faces_indexed?: boolean | null
          featured?: boolean | null
          id?: number
          src: string
          subcategory?: string
          title: string
          updated_at?: string | null
          year: string
        }
        Update: {
          category?: string
          created_at?: string | null
          faces_indexed?: boolean | null
          featured?: boolean | null
          id?: number
          src?: string
          subcategory?: string
          title?: string
          updated_at?: string | null
          year?: string
        }
        Relationships: []
      }
      gallery_settings: {
        Row: {
          background_blur_px: number
          card_blur_max: number
          distance: number
          id: number
          reveal_duration_ms: number
          reveal_enabled: boolean
          reveal_orientation: string
          scroll_per_item: number
          updated_at: string
        }
        Insert: {
          background_blur_px?: number
          card_blur_max?: number
          distance?: number
          id?: number
          reveal_duration_ms?: number
          reveal_enabled?: boolean
          reveal_orientation?: string
          scroll_per_item?: number
          updated_at?: string
        }
        Update: {
          background_blur_px?: number
          card_blur_max?: number
          distance?: number
          id?: number
          reveal_duration_ms?: number
          reveal_enabled?: boolean
          reveal_orientation?: string
          scroll_per_item?: number
          updated_at?: string
        }
        Relationships: []
      }
      guest_artists: {
        Row: {
          achievements: string[] | null
          countdown_enabled: boolean | null
          created_at: string | null
          description: string
          enabled: boolean | null
          id: number
          image: string
          is_featured: boolean | null
          live_now_enabled: boolean
          name: string
          order_position: number | null
          performance_at: string | null
          social_links: Json | null
          specialty: string
          title: string
          updated_at: string | null
          venue: string | null
          video: string | null
          video_url: string | null
          watch_live_url: string | null
          youtube_url: string | null
        }
        Insert: {
          achievements?: string[] | null
          countdown_enabled?: boolean | null
          created_at?: string | null
          description: string
          enabled?: boolean | null
          id?: never
          image: string
          is_featured?: boolean | null
          live_now_enabled?: boolean
          name: string
          order_position?: number | null
          performance_at?: string | null
          social_links?: Json | null
          specialty: string
          title: string
          updated_at?: string | null
          venue?: string | null
          video?: string | null
          video_url?: string | null
          watch_live_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          achievements?: string[] | null
          countdown_enabled?: boolean | null
          created_at?: string | null
          description?: string
          enabled?: boolean | null
          id?: never
          image?: string
          is_featured?: boolean | null
          live_now_enabled?: boolean
          name?: string
          order_position?: number | null
          performance_at?: string | null
          social_links?: Json | null
          specialty?: string
          title?: string
          updated_at?: string | null
          venue?: string | null
          video?: string | null
          video_url?: string | null
          watch_live_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      health_heartbeats: {
        Row: {
          created_at: string
          id: number
          last_run: string | null
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id: number
          last_run?: string | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          last_run?: string | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hero_media: {
        Row: {
          background_type: string
          created_at: string
          desktop_offset_x: number
          desktop_offset_y: number
          desktop_zoom: number
          enabled: boolean
          id: number
          image_url: string | null
          mobile_image_url: string | null
          mobile_offset_x: number
          mobile_offset_y: number
          mobile_poster_url: string | null
          mobile_video_url: string | null
          mobile_zoom: number
          overlay_color: string | null
          overlay_opacity: number
          page_key: string
          poster_url: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          background_type?: string
          created_at?: string
          desktop_offset_x?: number
          desktop_offset_y?: number
          desktop_zoom?: number
          enabled?: boolean
          id?: number
          image_url?: string | null
          mobile_image_url?: string | null
          mobile_offset_x?: number
          mobile_offset_y?: number
          mobile_poster_url?: string | null
          mobile_video_url?: string | null
          mobile_zoom?: number
          overlay_color?: string | null
          overlay_opacity?: number
          page_key: string
          poster_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          background_type?: string
          created_at?: string
          desktop_offset_x?: number
          desktop_offset_y?: number
          desktop_zoom?: number
          enabled?: boolean
          id?: number
          image_url?: string | null
          mobile_image_url?: string | null
          mobile_offset_x?: number
          mobile_offset_y?: number
          mobile_poster_url?: string | null
          mobile_video_url?: string | null
          mobile_zoom?: number
          overlay_color?: string | null
          overlay_opacity?: number
          page_key?: string
          poster_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      homebound_settings: {
        Row: {
          created_at: string
          id: number
          instagram_enabled: boolean
          instagram_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          instagram_enabled?: boolean
          instagram_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          instagram_enabled?: boolean
          instagram_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homepage_settings: {
        Row: {
          brand_logo_glow_color: string | null
          brand_logo_glow_strength: number | null
          brand_logo_offset_x_lg_px: number | null
          brand_logo_offset_x_md_px: number | null
          brand_logo_offset_x_px: number | null
          brand_logo_offset_x_sm_px: number | null
          brand_logo_offset_y_lg_px: number | null
          brand_logo_offset_y_md_px: number | null
          brand_logo_offset_y_px: number | null
          brand_logo_offset_y_sm_px: number | null
          brand_logo_side: string | null
          brand_logo_size_px: number | null
          brand_logo_url: string | null
          brand_year: number | null
          committee_marquee_direction: string | null
          committee_marquee_speed_px_per_sec: number | null
          created_at: string | null
          featured_partners_enabled: boolean
          hero_description: string | null
          hero_media_type: string | null
          hero_media_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          instagram_aftermovie_enabled: boolean
          instagram_aftermovie_subtitle: string | null
          instagram_aftermovie_title: string | null
          instagram_aftermovie_url: string | null
          instagram_trailer_enabled: boolean
          instagram_trailer_subtitle: string | null
          instagram_trailer_title: string | null
          instagram_trailer_url: string | null
          leadership_carousel_speed_ms: number
          show_committee_heads: boolean
          show_faculty_heads: boolean
          sponsor_logos: Json | null
          sponsor_section_enabled: boolean | null
          sponsor_section_subtitle: string | null
          sponsor_section_text: string | null
          sponsor_section_title: string | null
          sponsors_belt_direction: string | null
          sponsors_belt_speed_px_per_sec: number | null
          updated_at: string | null
        }
        Insert: {
          brand_logo_glow_color?: string | null
          brand_logo_glow_strength?: number | null
          brand_logo_offset_x_lg_px?: number | null
          brand_logo_offset_x_md_px?: number | null
          brand_logo_offset_x_px?: number | null
          brand_logo_offset_x_sm_px?: number | null
          brand_logo_offset_y_lg_px?: number | null
          brand_logo_offset_y_md_px?: number | null
          brand_logo_offset_y_px?: number | null
          brand_logo_offset_y_sm_px?: number | null
          brand_logo_side?: string | null
          brand_logo_size_px?: number | null
          brand_logo_url?: string | null
          brand_year?: number | null
          committee_marquee_direction?: string | null
          committee_marquee_speed_px_per_sec?: number | null
          created_at?: string | null
          featured_partners_enabled?: boolean
          hero_description?: string | null
          hero_media_type?: string | null
          hero_media_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          instagram_aftermovie_enabled?: boolean
          instagram_aftermovie_subtitle?: string | null
          instagram_aftermovie_title?: string | null
          instagram_aftermovie_url?: string | null
          instagram_trailer_enabled?: boolean
          instagram_trailer_subtitle?: string | null
          instagram_trailer_title?: string | null
          instagram_trailer_url?: string | null
          leadership_carousel_speed_ms?: number
          show_committee_heads?: boolean
          show_faculty_heads?: boolean
          sponsor_logos?: Json | null
          sponsor_section_enabled?: boolean | null
          sponsor_section_subtitle?: string | null
          sponsor_section_text?: string | null
          sponsor_section_title?: string | null
          sponsors_belt_direction?: string | null
          sponsors_belt_speed_px_per_sec?: number | null
          updated_at?: string | null
        }
        Update: {
          brand_logo_glow_color?: string | null
          brand_logo_glow_strength?: number | null
          brand_logo_offset_x_lg_px?: number | null
          brand_logo_offset_x_md_px?: number | null
          brand_logo_offset_x_px?: number | null
          brand_logo_offset_x_sm_px?: number | null
          brand_logo_offset_y_lg_px?: number | null
          brand_logo_offset_y_md_px?: number | null
          brand_logo_offset_y_px?: number | null
          brand_logo_offset_y_sm_px?: number | null
          brand_logo_side?: string | null
          brand_logo_size_px?: number | null
          brand_logo_url?: string | null
          brand_year?: number | null
          committee_marquee_direction?: string | null
          committee_marquee_speed_px_per_sec?: number | null
          created_at?: string | null
          featured_partners_enabled?: boolean
          hero_description?: string | null
          hero_media_type?: string | null
          hero_media_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          instagram_aftermovie_enabled?: boolean
          instagram_aftermovie_subtitle?: string | null
          instagram_aftermovie_title?: string | null
          instagram_aftermovie_url?: string | null
          instagram_trailer_enabled?: boolean
          instagram_trailer_subtitle?: string | null
          instagram_trailer_title?: string | null
          instagram_trailer_url?: string | null
          leadership_carousel_speed_ms?: number
          show_committee_heads?: boolean
          show_faculty_heads?: boolean
          sponsor_logos?: Json | null
          sponsor_section_enabled?: boolean | null
          sponsor_section_subtitle?: string | null
          sponsor_section_text?: string | null
          sponsor_section_title?: string | null
          sponsors_belt_direction?: string | null
          sponsors_belt_speed_px_per_sec?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          id: number
          identifier: string | null
          ip_address: string | null
          role: string
          status: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          identifier?: string | null
          ip_address?: string | null
          role: string
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          identifier?: string | null
          ip_address?: string | null
          role?: string
          status?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          college_department: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          motivation: string | null
          participant_type: string
          phone: string
          status: string | null
        }
        Insert: {
          college_department: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          motivation?: string | null
          participant_type?: string
          phone: string
          status?: string | null
        }
        Update: {
          college_department?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          motivation?: string | null
          participant_type?: string
          phone?: string
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          admin_only: boolean
          auto_dismiss_seconds: number | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          glow_color: string | null
          id: number
          link_url: string | null
          message: string
          priority: number
          starts_at: string
          text_color: string | null
          title: string | null
          type: string
          visible: boolean
        }
        Insert: {
          admin_only?: boolean
          auto_dismiss_seconds?: number | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          glow_color?: string | null
          id?: number
          link_url?: string | null
          message: string
          priority?: number
          starts_at?: string
          text_color?: string | null
          title?: string | null
          type?: string
          visible?: boolean
        }
        Update: {
          admin_only?: boolean
          auto_dismiss_seconds?: number | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          glow_color?: string | null
          id?: number
          link_url?: string | null
          message?: string
          priority?: number
          starts_at?: string
          text_color?: string | null
          title?: string | null
          type?: string
          visible?: boolean
        }
        Relationships: []
      }
      pass_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pass_scans: {
        Row: {
          guard_name: string | null
          id: number
          participant_name: string | null
          pass_id: string | null
          pass_token: string | null
          pass_type: string | null
          scan_result: string
          scanned_at: string
          scanned_by_username: string
        }
        Insert: {
          guard_name?: string | null
          id?: number
          participant_name?: string | null
          pass_id?: string | null
          pass_token?: string | null
          pass_type?: string | null
          scan_result: string
          scanned_at?: string
          scanned_by_username: string
        }
        Update: {
          guard_name?: string | null
          id?: number
          participant_name?: string | null
          pass_id?: string | null
          pass_token?: string | null
          pass_type?: string | null
          scan_result?: string
          scanned_at?: string
          scanned_by_username?: string
        }
        Relationships: [
          {
            foreignKeyName: "pass_scans_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "entry_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      passkey_challenges: {
        Row: {
          challenge: string
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      passkeys: {
        Row: {
          counter: number | null
          created_at: string | null
          credential_id: string
          email: string | null
          failed_attempts: number | null
          id: string
          last_attempt_at: string | null
          last_used_at: string | null
          public_key: string
          transports: Json | null
          user_id: string
        }
        Insert: {
          counter?: number | null
          created_at?: string | null
          credential_id: string
          email?: string | null
          failed_attempts?: number | null
          id?: string
          last_attempt_at?: string | null
          last_used_at?: string | null
          public_key: string
          transports?: Json | null
          user_id: string
        }
        Update: {
          counter?: number | null
          created_at?: string | null
          credential_id?: string
          email?: string | null
          failed_attempts?: number | null
          id?: string
          last_attempt_at?: string | null
          last_used_at?: string | null
          public_key?: string
          transports?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profile_likes: {
        Row: {
          created_at: string
          id: string
          liker_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liker_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liker_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          _synced_at: string | null
          aura_color: string | null
          avatar_url: string | null
          background_url: string | null
          batch: string | null
          bio: string | null
          college: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          likes_count: number | null
          participant_type: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          _synced_at?: string | null
          aura_color?: string | null
          avatar_url?: string | null
          background_url?: string | null
          batch?: string | null
          bio?: string | null
          college?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          likes_count?: number | null
          participant_type?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          _synced_at?: string | null
          aura_color?: string | null
          avatar_url?: string | null
          background_url?: string | null
          batch?: string | null
          bio?: string | null
          college?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          likes_count?: number | null
          participant_type?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          _synced_at: string | null
          college: string
          created_at: string | null
          deleted_at: string | null
          email: string
          event_id: string | null
          event_title: string
          full_name: string
          id: string
          is_team_registration: boolean | null
          metadata: Json | null
          participant_type: string
          phone: string
          photo_url: string | null
          registration_date: string
          status: string | null
          team_id: string | null
          team_members: Json | null
          team_name: string | null
          total_members: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          _synced_at?: string | null
          college: string
          created_at?: string | null
          deleted_at?: string | null
          email: string
          event_id?: string | null
          event_title: string
          full_name: string
          id?: string
          is_team_registration?: boolean | null
          metadata?: Json | null
          participant_type: string
          phone: string
          photo_url?: string | null
          registration_date: string
          status?: string | null
          team_id?: string | null
          team_members?: Json | null
          team_name?: string | null
          total_members?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          _synced_at?: string | null
          college?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          event_id?: string | null
          event_title?: string
          full_name?: string
          id?: string
          is_team_registration?: boolean | null
          metadata?: Json | null
          participant_type?: string
          phone?: string
          photo_url?: string | null
          registration_date?: string
          status?: string | null
          team_id?: string | null
          team_members?: Json | null
          team_name?: string | null
          total_members?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_milestones: {
        Row: {
          created_at: string
          enabled: boolean
          id: number
          order_position: number
          points: string[] | null
          side: string
          title: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: number
          order_position?: number
          points?: string[] | null
          side?: string
          title?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: number
          order_position?: number
          points?: string[] | null
          side?: string
          title?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      schedule_days: {
        Row: {
          created_at: string | null
          date: string
          day: string
          id: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          day: string
          id?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          day?: string
          id?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          created_at: string | null
          duration: string
          event_id: string | null
          guest_artist_id: number | null
          id: number
          schedule_day_id: number | null
          time: string
          title: string
          type: string
          updated_at: string | null
          venue: string
        }
        Insert: {
          created_at?: string | null
          duration: string
          event_id?: string | null
          guest_artist_id?: number | null
          id?: number
          schedule_day_id?: number | null
          time: string
          title: string
          type: string
          updated_at?: string | null
          venue: string
        }
        Update: {
          created_at?: string | null
          duration?: string
          event_id?: string | null
          guest_artist_id?: number | null
          id?: number
          schedule_day_id?: number | null
          time?: string
          title?: string
          type?: string
          updated_at?: string | null
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_guest_artist_id_fkey"
            columns: ["guest_artist_id"]
            isOneToOne: false
            referencedRelation: "guest_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_schedule_day_id_fkey"
            columns: ["schedule_day_id"]
            isOneToOne: false
            referencedRelation: "schedule_days"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          council_passcode: string | null
          council_password_hash: string | null
          councils_enabled: boolean | null
          entry_pass_button_enabled: boolean | null
          event_dates: Json | null
          id: number
          pass_template_config: Json | null
          sports_passcode: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          council_passcode?: string | null
          council_password_hash?: string | null
          councils_enabled?: boolean | null
          entry_pass_button_enabled?: boolean | null
          event_dates?: Json | null
          id?: number
          pass_template_config?: Json | null
          sports_passcode?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          council_passcode?: string | null
          council_password_hash?: string | null
          councils_enabled?: boolean | null
          entry_pass_button_enabled?: boolean | null
          event_dates?: Json | null
          id?: number
          pass_template_config?: Json | null
          sports_passcode?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      security_users: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: number
          is_active: boolean
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: number
          is_active?: boolean
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: number
          is_active?: boolean
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      shoutouts: {
        Row: {
          created_at: string
          id: string
          is_anonymous: boolean | null
          is_approved: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoutouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          _synced_at: string | null
          annual_sports_mode_enabled: boolean
          batch_options: Json | null
          chat_locked: boolean
          coming_soon_enabled: boolean
          coming_soon_ended_text: string | null
          coming_soon_message: string | null
          coming_soon_title: string | null
          coming_soon_until: string | null
          created_at: string
          homepage_hero_title: string | null
          id: number
          registration_institution_optional: boolean | null
          registration_institution_visible: boolean | null
          registration_participant_quotas: Json | null
          registration_participant_types: Json | null
          shoutouts_daily_limit: number
          shoutouts_enabled: boolean
          shoutouts_expiry_hours: number
          site_closed: boolean
          sports_instagram_url: string | null
          sports_registration_config: Json | null
          student_google_auth_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          _synced_at?: string | null
          annual_sports_mode_enabled?: boolean
          batch_options?: Json | null
          chat_locked?: boolean
          coming_soon_enabled?: boolean
          coming_soon_ended_text?: string | null
          coming_soon_message?: string | null
          coming_soon_title?: string | null
          coming_soon_until?: string | null
          created_at?: string
          homepage_hero_title?: string | null
          id: number
          registration_institution_optional?: boolean | null
          registration_institution_visible?: boolean | null
          registration_participant_quotas?: Json | null
          registration_participant_types?: Json | null
          shoutouts_daily_limit?: number
          shoutouts_enabled?: boolean
          shoutouts_expiry_hours?: number
          site_closed?: boolean
          sports_instagram_url?: string | null
          sports_registration_config?: Json | null
          student_google_auth_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          _synced_at?: string | null
          annual_sports_mode_enabled?: boolean
          batch_options?: Json | null
          chat_locked?: boolean
          coming_soon_enabled?: boolean
          coming_soon_ended_text?: string | null
          coming_soon_message?: string | null
          coming_soon_title?: string | null
          coming_soon_until?: string | null
          created_at?: string
          homepage_hero_title?: string | null
          id?: number
          registration_institution_optional?: boolean | null
          registration_institution_visible?: boolean | null
          registration_participant_quotas?: Json | null
          registration_participant_types?: Json | null
          shoutouts_daily_limit?: number
          shoutouts_enabled?: boolean
          shoutouts_expiry_hours?: number
          site_closed?: boolean
          sports_instagram_url?: string | null
          sports_registration_config?: Json | null
          student_google_auth_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      social_media_settings: {
        Row: {
          created_at: string | null
          id: number
          instagram_enabled: boolean | null
          instagram_url: string | null
          updated_at: string | null
          youtube_enabled: boolean | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instagram_enabled?: boolean | null
          instagram_url?: string | null
          updated_at?: string | null
          youtube_enabled?: boolean | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instagram_enabled?: boolean | null
          instagram_url?: string | null
          updated_at?: string | null
          youtube_enabled?: boolean | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          category: string
          created_at: string | null
          description: string
          featured: boolean | null
          id: number
          logo: string
          name: string
          order_position: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          featured?: boolean | null
          id?: number
          logo: string
          name: string
          order_position?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          featured?: boolean | null
          id?: number
          logo?: string
          name?: string
          order_position?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      sponsorship_packages: {
        Row: {
          benefits: string[]
          color: string
          created_at: string | null
          enabled: boolean
          icon: string
          id: number
          order_position: number
          price: string
          tier: string
          updated_at: string | null
        }
        Insert: {
          benefits?: string[]
          color?: string
          created_at?: string | null
          enabled?: boolean
          icon?: string
          id?: never
          order_position?: number
          price: string
          tier: string
          updated_at?: string | null
        }
        Update: {
          benefits?: string[]
          color?: string
          created_at?: string | null
          enabled?: boolean
          icon?: string
          id?: never
          order_position?: number
          price?: string
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sponsorship_settings: {
        Row: {
          brochure_title: string
          brochure_url: string | null
          call_to_action_text: string
          created_at: string | null
          id: number
          intro_text: string
          page_title: string | null
          updated_at: string | null
        }
        Insert: {
          brochure_title?: string
          brochure_url?: string | null
          call_to_action_text?: string
          created_at?: string | null
          id?: number
          intro_text?: string
          page_title?: string | null
          updated_at?: string | null
        }
        Update: {
          brochure_title?: string
          brochure_url?: string | null
          call_to_action_text?: string
          created_at?: string | null
          id?: number
          intro_text?: string
          page_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sports_committees: {
        Row: {
          color: string
          created_at: string
          description: string
          enabled: boolean
          id: number
          name: string
          order_position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          name: string
          order_position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          name?: string
          order_position?: number
          updated_at?: string
        }
        Relationships: []
      }
      sports_matches: {
        Row: {
          annual_event_id: string | null
          annual_team_a_id: string | null
          annual_team_b_id: string | null
          created_at: string
          id: string
          match_date: string
          score1: string | null
          score2: string | null
          sport_id: string
          status: string | null
          team1_id: string | null
          team2_id: string | null
          updated_at: string
          venue: string | null
          winner_id: string | null
        }
        Insert: {
          annual_event_id?: string | null
          annual_team_a_id?: string | null
          annual_team_b_id?: string | null
          created_at?: string
          id: string
          match_date: string
          score1?: string | null
          score2?: string | null
          sport_id: string
          status?: string | null
          team1_id?: string | null
          team2_id?: string | null
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Update: {
          annual_event_id?: string | null
          annual_team_a_id?: string | null
          annual_team_b_id?: string | null
          created_at?: string
          id?: string
          match_date?: string
          score1?: string | null
          score2?: string | null
          sport_id?: string
          status?: string | null
          team1_id?: string | null
          team2_id?: string | null
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_matches_annual_team_a_id_fkey"
            columns: ["annual_team_a_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_matches_annual_team_b_id_fkey"
            columns: ["annual_team_b_id"]
            isOneToOne: false
            referencedRelation: "annual_sports_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_matches_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_players: {
        Row: {
          annual_event_id: string | null
          base_price: number | null
          category: string | null
          created_at: string
          id: string
          image: string | null
          is_motm_count: number | null
          name: string
          position: string | null
          role: string | null
          sold_day: number | null
          sold_price: number | null
          sport_id: string
          status: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          annual_event_id?: string | null
          base_price?: number | null
          category?: string | null
          created_at?: string
          id: string
          image?: string | null
          is_motm_count?: number | null
          name: string
          position?: string | null
          role?: string | null
          sold_day?: number | null
          sold_price?: number | null
          sport_id: string
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          annual_event_id?: string | null
          base_price?: number | null
          category?: string | null
          created_at?: string
          id?: string
          image?: string | null
          is_motm_count?: number | null
          name?: string
          position?: string | null
          role?: string | null
          sold_day?: number | null
          sold_price?: number | null
          sport_id?: string
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_players_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_registrations: {
        Row: {
          _synced_at: string | null
          created_at: string | null
          email: string | null
          experience: string | null
          id: number
          institution: string | null
          metadata: Json | null
          name: string
          phone: string | null
          photo_url: string | null
          position_preference: string | null
          sport_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          year_or_class: string | null
        }
        Insert: {
          _synced_at?: string | null
          created_at?: string | null
          email?: string | null
          experience?: string | null
          id?: number
          institution?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          photo_url?: string | null
          position_preference?: string | null
          sport_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_or_class?: string | null
        }
        Update: {
          _synced_at?: string | null
          created_at?: string | null
          email?: string | null
          experience?: string | null
          id?: number
          institution?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          position_preference?: string | null
          sport_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_or_class?: string | null
        }
        Relationships: []
      }
      sports_seasons: {
        Row: {
          auction_days: number
          auction_starts_at: string | null
          auction_status: string | null
          created_at: string
          enabled: boolean | null
          group_limits: Json | null
          id: string
          image: string | null
          max_owners: number | null
          max_players: number | null
          max_teams: number | null
          name: string
          owner_fee: number | null
          owner_registration_open: boolean | null
          player_fee: number | null
          player_registration_open: boolean | null
          registration_open: boolean | null
          season: string
          updated_at: string
        }
        Insert: {
          auction_days?: number
          auction_starts_at?: string | null
          auction_status?: string | null
          created_at?: string
          enabled?: boolean | null
          group_limits?: Json | null
          id: string
          image?: string | null
          max_owners?: number | null
          max_players?: number | null
          max_teams?: number | null
          name: string
          owner_fee?: number | null
          owner_registration_open?: boolean | null
          player_fee?: number | null
          player_registration_open?: boolean | null
          registration_open?: boolean | null
          season: string
          updated_at?: string
        }
        Update: {
          auction_days?: number
          auction_starts_at?: string | null
          auction_status?: string | null
          created_at?: string
          enabled?: boolean | null
          group_limits?: Json | null
          id?: string
          image?: string | null
          max_owners?: number | null
          max_players?: number | null
          max_teams?: number | null
          name?: string
          owner_fee?: number | null
          owner_registration_open?: boolean | null
          player_fee?: number | null
          player_registration_open?: boolean | null
          registration_open?: boolean | null
          season?: string
          updated_at?: string
        }
        Relationships: []
      }
      sports_team_members: {
        Row: {
          achievements: Json
          committee_id: number | null
          created_at: string
          description: string
          enabled: boolean
          id: number
          image: string
          is_head: boolean
          name: string
          order_position: number
          phone: string | null
          role: string
          social_links: Json
          updated_at: string
        }
        Insert: {
          achievements?: Json
          committee_id?: number | null
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          image: string
          is_head?: boolean
          name: string
          order_position?: number
          phone?: string | null
          role?: string
          social_links?: Json
          updated_at?: string
        }
        Update: {
          achievements?: Json
          committee_id?: number | null
          created_at?: string
          description?: string
          enabled?: boolean
          id?: number
          image?: string
          is_head?: boolean
          name?: string
          order_position?: number
          phone?: string | null
          role?: string
          social_links?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_team_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "sports_committees"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_teams: {
        Row: {
          annual_event_id: string | null
          color: string | null
          created_at: string
          draws: number | null
          id: string
          logo: string | null
          losses: number | null
          name: string
          nrr: number | null
          owner_image: string | null
          owner_name: string | null
          points: number | null
          short_name: string
          sport_id: string
          updated_at: string
          wins: number | null
        }
        Insert: {
          annual_event_id?: string | null
          color?: string | null
          created_at?: string
          draws?: number | null
          id: string
          logo?: string | null
          losses?: number | null
          name: string
          nrr?: number | null
          owner_image?: string | null
          owner_name?: string | null
          points?: number | null
          short_name: string
          sport_id: string
          updated_at?: string
          wins?: number | null
        }
        Update: {
          annual_event_id?: string | null
          color?: string | null
          created_at?: string
          draws?: number | null
          id?: string
          logo?: string | null
          losses?: number | null
          name?: string
          nrr?: number | null
          owner_image?: string | null
          owner_name?: string | null
          points?: number | null
          short_name?: string
          sport_id?: string
          updated_at?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_teams_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_setup_status: {
        Row: {
          buckets_created: boolean | null
          created_at: string | null
          id: number
          policies_configured: boolean | null
          setup_notes: string | null
          updated_at: string | null
        }
        Insert: {
          buckets_created?: boolean | null
          created_at?: string | null
          id?: number
          policies_configured?: boolean | null
          setup_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          buckets_created?: boolean | null
          created_at?: string | null
          id?: number
          policies_configured?: boolean | null
          setup_notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_activity_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          meta: Json | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_xp: {
        Row: {
          id: string
          tier: string | null
          updated_at: string | null
          xp_total: number | null
        }
        Insert: {
          id: string
          tier?: string | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Update: {
          id?: string
          tier?: string | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_xp_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_rules: {
        Row: {
          config: Json
          created_at: string | null
          error_message: string | null
          id: string
          is_active: boolean | null
          pass_type: string | null
          priority: number | null
          rule_name: string
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          pass_type?: string | null
          priority?: number | null
          rule_name: string
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          pass_type?: string | null
          priority?: number | null
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      student_upcoming_events: {
        Row: {
          end_time: string | null
          event_title: string | null
          item_id: string | null
          item_type: string | null
          start_time: string | null
          status: string | null
          student_id: string | null
          venue: string | null
        }
        Relationships: []
      }
      view_profile_admirers: {
        Row: {
          created_at: string | null
          liker_avatar: string | null
          liker_id: string | null
          liker_name: string | null
          liker_tier: string | null
          target_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_admin_by_email: { Args: { p_email: string }; Returns: boolean }
      approve_pass_registration: {
        Args: { p_pass_reg_id: string }
        Returns: Json
      }
      authenticate_security_user: {
        Args: { p_password: string; p_username: string }
        Returns: Json
      }
      award_xp: {
        Args: {
          p_action: string
          p_meta?: Json
          p_user_id: string
          p_xp: number
        }
        Returns: undefined
      }
      can_edit_site_settings: { Args: never; Returns: boolean }
      cleanup_auth_data: { Args: never; Returns: undefined }
      cleanup_expired_messages: { Args: never; Returns: undefined }
      cleanup_old_scans: { Args: never; Returns: undefined }
      cleanup_old_sessions: { Args: never; Returns: undefined }
      create_security_user: {
        Args: { p_full_name: string; p_password: string; p_username: string }
        Returns: Json
      }
      create_vip_pass: {
        Args: { p_council_password?: string; p_name?: string; p_notes?: string }
        Returns: Json
      }
      create_vip_pass_v2: {
        Args: { p_council_password?: string; p_name?: string; p_notes?: string }
        Returns: Json
      }
      create_vip_pass_v3: {
        Args: {
          p_council_password?: string
          p_name?: string
          p_notes?: string
          p_valid_date?: string
        }
        Returns: Json
      }
      delete_entry_pass: {
        Args: { p_council_password?: string; p_pass_id: string }
        Returns: Json
      }
      delete_entry_pass_v2: {
        Args: { p_council_password?: string; p_pass_id?: string }
        Returns: Json
      }
      delete_entry_pass_v3: {
        Args: { p_council_password?: string; p_pass_id?: string }
        Returns: Json
      }
      delete_event_category: {
        Args: { p_category_id: number; p_fallback_name?: string }
        Returns: undefined
      }
      delete_pass_registration: { Args: { p_reg_id: string }; Returns: Json }
      delete_pass_scan_for_date: {
        Args: { p_date: string; p_pass_id: string }
        Returns: Json
      }
      delete_security_user: { Args: { p_user_id: number }; Returns: Json }
      generate_annual_sports_reg_id: { Args: never; Returns: string }
      generate_pass_for_event_registration: {
        Args: { p_registration_id: string }
        Returns: Json
      }
      get_council_dashboard_stats: {
        Args: { p_password: string }
        Returns: Json
      }
      get_council_dashboard_stats_v2: {
        Args: { p_password: string }
        Returns: Json
      }
      get_council_dashboard_stats_v3: {
        Args: { p_password: string }
        Returns: Json
      }
      get_council_vip_passes: { Args: { p_password: string }; Returns: Json }
      get_council_vip_passes_v2: { Args: { p_password: string }; Returns: Json }
      get_council_vip_passes_v3: {
        Args: { p_password: string }
        Returns: {
          created_at: string
          is_active: boolean
          is_used: boolean
          notes: string
          participant_name: string
          pass_id: string
          pass_token: string
          pass_type: Database["public"]["Enums"]["pass_type"]
          usage_logs: Json
        }[]
      }
      get_public_event_winners: {
        Args: never
        Returns: {
          category: string
          created_at: string
          event_id: number
          id: number
          name: string
          photo_url: string
          position: number
          registration_id: string
          registration_name: string
          team_members: Json
          year: string
        }[]
      }
      get_public_security_users: {
        Args: never
        Returns: {
          full_name: string
          username: string
        }[]
      }
      get_security_dashboard_stats: {
        Args: { p_username: string }
        Returns: Json
      }
      has_permission: { Args: { p_section: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_owner:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_coordinator: { Args: { uid: string }; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      log_login_attempt: {
        Args: { p_identifier: string; p_role: string; p_status?: string }
        Returns: undefined
      }
      login_coordinator: {
        Args: { event_id_param: number; password_param: string }
        Returns: Json
      }
      next_registration_id: { Args: never; Returns: string }
      process_pass_scan_v3: {
        Args: { p_guard_name?: string; p_pass_token: string }
        Returns: Json
      }
      purge_all_logs: { Args: never; Returns: undefined }
      register_for_event: {
        Args: {
          p_college: string
          p_email: string
          p_event_id: number
          p_event_title: string
          p_full_name: string
          p_id: string
          p_is_team_registration: boolean
          p_participant_type: string
          p_phone: string
          p_photo_url: string
          p_registration_date: string
          p_team_members: Json
          p_team_name: string
          p_total_members: number
        }
        Returns: string
      }
      reorder_event_categories: {
        Args: { p_ids: number[] }
        Returns: undefined
      }
      reset_pass_usage: { Args: { p_pass_id: string }; Returns: Json }
      search_gallery_faces: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          image_id: number
          similarity: number
        }[]
      }
      set_council_password: { Args: { p_password: string }; Returns: Json }
      toggle_pass_council_visibility: {
        Args: { p_hidden: boolean; p_pass_id: string }
        Returns: Json
      }
      update_coordinator_registration_status: {
        Args: {
          p_event_id: number
          p_new_status: string
          p_reg_id: string
          p_token: string
        }
        Returns: boolean
      }
      update_event_payment_gateway: {
        Args: {
          p_event_id: number
          p_new_amount?: number
          p_new_config: Json
          p_token: string
        }
        Returns: boolean
      }
      update_form_settings: {
        Args: {
          p_audition_form_enabled?: boolean
          p_audition_form_message?: string
          p_membership_form_enabled?: boolean
          p_membership_form_message?: string
        }
        Returns: {
          audition_form_enabled: boolean | null
          audition_form_message: string | null
          created_at: string | null
          id: number
          membership_form_enabled: boolean | null
          membership_form_message: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "form_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_pass_date: {
        Args: { p_new_date: string; p_pass_id: string }
        Returns: Json
      }
      validate_entry_pass: { Args: { p_pass_token: string }; Returns: Json }
    }
    Enums: {
      admin_role: "owner" | "admin"
      announcement_target: "all" | "students" | "coordinators"
      pass_type: "event_registration" | "general_entry" | "vip"
      sender_role_type: "admin" | "coordinator" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_role: ["owner", "admin"],
      announcement_target: ["all", "students", "coordinators"],
      pass_type: ["event_registration", "general_entry", "vip"],
      sender_role_type: ["admin", "coordinator", "student"],
    },
  },
} as const

