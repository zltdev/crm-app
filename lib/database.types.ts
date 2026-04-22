export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_conversations: {
        Row: {
          agent_name: string | null
          campaign_id: string | null
          channel: string
          contact_id: string
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json
          started_at: string
        }
        Insert: {
          agent_name?: string | null
          campaign_id?: string | null
          channel: string
          contact_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string
        }
        Update: {
          agent_name?: string | null
          campaign_id?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string
        }
        Relationships: []
      }
      automation_flows: {
        Row: {
          campaign_id: string | null
          created_at: string
          definition: Json
          id: string
          name: string
          status: string
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          definition?: Json
          id?: string
          name: string
          status?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          definition?: Json
          id?: string
          name?: string
          status?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_deliveries: {
        Row: {
          automation_flow_id: string | null
          campaign_id: string
          channel: string
          clicked_at: string | null
          contact_id: string
          content_piece_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string
          id: string
          metadata: Json
          opened_at: string | null
          replied_at: string | null
          scheduled_at: string | null
        }
        Insert: {
          automation_flow_id?: string | null
          campaign_id: string
          channel: string
          clicked_at?: string | null
          contact_id: string
          content_piece_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          metadata?: Json
          opened_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
        }
        Update: {
          automation_flow_id?: string | null
          campaign_id?: string
          channel?: string
          clicked_at?: string | null
          contact_id?: string
          content_piece_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          metadata?: Json
          opened_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          channel: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          metadata: Json
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          body: string | null
          campaign_id: string | null
          channel: string
          contact_id: string
          created_at: string
          direction: string
          id: string
          metadata: Json
          occurred_at: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          channel: string
          contact_id: string
          created_at?: string
          direction: string
          id?: string
          metadata?: Json
          occurred_at?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          subject?: string | null
        }
        Relationships: []
      }
      contact_scores: {
        Row: {
          calculated_at: string
          contact_id: string
          engagement_score: number
          fit_score: number
          freshness_score: number
          id: string
          intent_score: number
          is_current: boolean
          metadata: Json
          score_total: number
          scoring_model: string | null
        }
        Insert: {
          calculated_at?: string
          contact_id: string
          engagement_score?: number
          fit_score?: number
          freshness_score?: number
          id?: string
          intent_score?: number
          is_current?: boolean
          metadata?: Json
          score_total?: number
          scoring_model?: string | null
        }
        Update: {
          calculated_at?: string
          contact_id?: string
          engagement_score?: number
          fit_score?: number
          freshness_score?: number
          id?: string
          intent_score?: number
          is_current?: boolean
          metadata?: Json
          score_total?: number
          scoring_model?: string | null
        }
        Relationships: []
      }
      contact_segments: {
        Row: {
          assigned_at: string
          assignment_source: string | null
          contact_id: string
          id: string
          metadata: Json
          segment_id: string
        }
        Insert: {
          assigned_at?: string
          assignment_source?: string | null
          contact_id: string
          id?: string
          metadata?: Json
          segment_id: string
        }
        Update: {
          assigned_at?: string
          assignment_source?: string | null
          contact_id?: string
          id?: string
          metadata?: Json
          segment_id?: string
        }
        Relationships: []
      }
      contact_touchpoints: {
        Row: {
          campaign_id: string | null
          contact_id: string
          created_at: string
          event_id: string | null
          expo_id: string | null
          form_id: string | null
          id: string
          metadata: Json
          occurred_at: string
          source_name: string | null
          source_type: string
        }
        Insert: {
          campaign_id?: string | null
          contact_id: string
          created_at?: string
          event_id?: string | null
          expo_id?: string | null
          form_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          source_name?: string | null
          source_type: string
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string
          created_at?: string
          event_id?: string | null
          expo_id?: string | null
          form_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          source_name?: string | null
          source_type?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          email_normalized: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string
          phone_normalized: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone: string
          phone_normalized?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string
          phone_normalized?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_pieces: {
        Row: {
          body: string | null
          campaign_id: string | null
          channel: string | null
          content_type: string
          created_at: string
          id: string
          metadata: Json
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          content_type: string
          created_at?: string
          id?: string
          metadata?: Json
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_attendances: {
        Row: {
          attendance_status: string
          checked_in_at: string | null
          contact_id: string
          created_at: string
          event_id: string
          id: string
          lead_source: string | null
          metadata: Json
        }
        Insert: {
          attendance_status?: string
          checked_in_at?: string | null
          contact_id: string
          created_at?: string
          event_id: string
          id?: string
          lead_source?: string | null
          metadata?: Json
        }
        Update: {
          attendance_status?: string
          checked_in_at?: string | null
          contact_id?: string
          created_at?: string
          event_id?: string
          id?: string
          lead_source?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      events: {
        Row: {
          campaign_id: string | null
          created_at: string
          end_at: string | null
          event_type: string | null
          id: string
          location: string | null
          metadata: Json
          name: string
          start_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          end_at?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          name: string
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          end_at?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          name?: string
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expo_contacts: {
        Row: {
          contact_id: string
          created_at: string
          expo_id: string
          id: string
          interaction_result: string | null
          metadata: Json
          sales_rep: string | null
          stand: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          expo_id: string
          id?: string
          interaction_result?: string | null
          metadata?: Json
          sales_rep?: string | null
          stand?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          expo_id?: string
          id?: string
          interaction_result?: string | null
          metadata?: Json
          sales_rep?: string | null
          stand?: string | null
        }
        Relationships: []
      }
      expos: {
        Row: {
          campaign_id: string | null
          city: string | null
          country: string | null
          created_at: string
          end_date: string | null
          id: string
          metadata: Json
          name: string
          start_date: string | null
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          metadata?: Json
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          metadata?: Json
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          campaign_id: string | null
          contact_id: string
          created_at: string
          form_id: string
          id: string
          payload: Json
          submitted_at: string
        }
        Insert: {
          campaign_id?: string | null
          contact_id: string
          created_at?: string
          form_id: string
          id?: string
          payload?: Json
          submitted_at?: string
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string
          created_at?: string
          form_id?: string
          id?: string
          payload?: Json
          submitted_at?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          slug: string | null
          source_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          slug?: string | null
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          slug?: string | null
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          file_name: string
          id: string
          processed_at: string | null
          row_count: number | null
          source_name: string
          source_type: string
          status: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          processed_at?: string | null
          row_count?: number | null
          source_name: string
          source_type: string
          status?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          processed_at?: string | null
          row_count?: number | null
          source_name?: string
          source_type?: string
          status?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      import_rows_normalized: {
        Row: {
          batch_id: string
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          matched_contact_id: string | null
          metadata: Json
          normalization_status: string
          normalized_email: string | null
          normalized_phone: string | null
          occurred_at: string | null
          raw_row_id: string | null
          source_name: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          matched_contact_id?: string | null
          metadata?: Json
          normalization_status?: string
          normalized_email?: string | null
          normalized_phone?: string | null
          occurred_at?: string | null
          raw_row_id?: string | null
          source_name?: string | null
          source_type: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          matched_contact_id?: string | null
          metadata?: Json
          normalization_status?: string
          normalized_email?: string | null
          normalized_phone?: string | null
          occurred_at?: string | null
          raw_row_id?: string | null
          source_name?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_rows_raw: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          raw_payload: Json
          row_number: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          raw_payload: Json
          row_number?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          raw_payload?: Json
          row_number?: number | null
        }
        Relationships: []
      }
      phone_calls: {
        Row: {
          campaign_id: string | null
          contact_id: string
          created_at: string
          direction: string
          duration_seconds: number | null
          id: string
          metadata: Json
          occurred_at: string
          outcome: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id: string
          created_at?: string
          direction: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          occurred_at?: string
          outcome?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          occurred_at?: string
          outcome?: string | null
        }
        Relationships: []
      }
      segments: {
        Row: {
          created_at: string
          definition: Json
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      normalize_email: { Args: { e: string }; Returns: string }
      normalize_phone: { Args: { p: string }; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Update"]
