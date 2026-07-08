export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      analytics_events: {
        Row: {
          created_at: string
          id: string
          name: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      destination_interest: {
        Row: {
          created_at: string
          destination: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          currency: string
          description: string
          id: string
          payer_id: string
          settled: boolean
          settled_by: string[]
          split_user_ids: string[]
          trip_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          payer_id: string
          settled?: boolean
          settled_by?: string[]
          split_user_ids?: string[]
          trip_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          payer_id?: string
          settled?: boolean
          settled_by?: string[]
          split_user_ids?: string[]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          metadata: Json
          reply_to: string | null
          sender_id: string | null
          trip_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          reply_to?: string | null
          sender_id?: string | null
          trip_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          reply_to?: string | null
          sender_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_trip_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_trip_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_trip_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reports_reported_trip_id_fkey"
            columns: ["reported_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          message_id: string
          question: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          message_id: string
          question: string
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          message_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string
          created_at: string
          destination: string | null
          id: string
          images: string[]
          post_type: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          destination?: string | null
          id?: string
          images?: string[]
          post_type?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          destination?: string | null
          id?: string
          images?: string[]
          post_type?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          budget_range: string | null
          countries_count: number
          created_at: string
          email_verified: boolean
          full_name: string
          group_preference: string | null
          id: string
          interests: string[] | null
          last_destination: string | null
          last_travel_date: string | null
          location: string | null
          onboarding_completed: boolean
          onboarding_intro_seen: boolean
          response_time_expectation: string | null
          travel_personality: string | null
          travel_style: string | null
          travel_urgency_days: number | null
          trips_count: number
          updated_at: string
          username: string | null
          vibe: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          budget_range?: string | null
          countries_count?: number
          created_at?: string
          email_verified?: boolean
          full_name?: string
          group_preference?: string | null
          id: string
          interests?: string[] | null
          last_destination?: string | null
          last_travel_date?: string | null
          location?: string | null
          onboarding_completed?: boolean
          onboarding_intro_seen?: boolean
          response_time_expectation?: string | null
          travel_personality?: string | null
          travel_style?: string | null
          travel_urgency_days?: number | null
          trips_count?: number
          updated_at?: string
          username?: string | null
          vibe?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          budget_range?: string | null
          countries_count?: number
          created_at?: string
          email_verified?: boolean
          full_name?: string
          group_preference?: string | null
          id?: string
          interests?: string[] | null
          last_destination?: string | null
          last_travel_date?: string | null
          location?: string | null
          onboarding_completed?: boolean
          onboarding_intro_seen?: boolean
          response_time_expectation?: string | null
          travel_personality?: string | null
          travel_style?: string | null
          travel_urgency_days?: number | null
          trips_count?: number
          updated_at?: string
          username?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          face_image: string
          how_to_contribute: string
          id: string
          images: string[]
          needs: string
          title: string
          what_solving: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          face_image: string
          how_to_contribute?: string
          id?: string
          images?: string[]
          needs?: string
          title: string
          what_solving?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          face_image?: string
          how_to_contribute?: string
          id?: string
          images?: string[]
          needs?: string
          title?: string
          what_solving?: string
        }
        Relationships: []
      }
      saved_trips: {
        Row: {
          id: string
          saved_at: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          saved_at?: string
          trip_id: string
          user_id?: string
        }
        Update: {
          id?: string
          saved_at?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_trips_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          id: string
          joined_at: string
          rejection_reason: string | null
          role: string
          status: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          rejection_reason?: string | null
          role?: string
          status?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          rejection_reason?: string | null
          role?: string
          status?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_spend_estimates: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_spend_estimates_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_flexibility: string | null
          budget_max: number | null
          budget_min: number | null
          country: string | null
          cover_image: string | null
          created_at: string
          currency: string | null
          description: string | null
          destination: string
          end_date: string
          id: string
          max_members: number
          organizer_id: string
          privacy: string
          solo_friendly: boolean
          start_date: string
          title: string
          updated_at: string
          vibe_summary: string | null
          vibe_tags: string[] | null
        }
        Insert: {
          budget_flexibility?: string | null
          budget_max?: number | null
          budget_min?: number | null
          country?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          destination: string
          end_date: string
          id?: string
          max_members?: number
          organizer_id: string
          privacy?: string
          solo_friendly?: boolean
          start_date: string
          title: string
          updated_at?: string
          vibe_summary?: string | null
          vibe_tags?: string[] | null
        }
        Update: {
          budget_flexibility?: string | null
          budget_max?: number | null
          budget_min?: number | null
          country?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          destination?: string
          end_date?: string
          id?: string
          max_members?: number
          organizer_id?: string
          privacy?: string
          solo_friendly?: boolean
          start_date?: string
          title?: string
          updated_at?: string
          vibe_summary?: string | null
          vibe_tags?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_message_trip_member: {
        Args: { _message_id: string; _user_id: string }
        Returns: boolean
      }
      is_poll_trip_member: {
        Args: { _poll_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_approved_member: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_organizer: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
