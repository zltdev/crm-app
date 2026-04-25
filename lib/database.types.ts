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
          conversation_id: string | null
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
          conversation_id?: string | null
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
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "automation_flows_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "campaign_deliveries_automation_flow_id_fkey"
            columns: ["automation_flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_deliveries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_deliveries_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "communications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "contact_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "contact_segments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_touchpoints: {
        Row: {
          agent_conversation_id: string | null
          campaign_id: string | null
          communication_id: string | null
          contact_id: string
          created_at: string
          event_id: string | null
          expo_id: string | null
          form_id: string | null
          id: string
          metadata: Json
          occurred_at: string
          phone_call_id: string | null
          source_name: string | null
          source_type: string
        }
        Insert: {
          agent_conversation_id?: string | null
          campaign_id?: string | null
          communication_id?: string | null
          contact_id: string
          created_at?: string
          event_id?: string | null
          expo_id?: string | null
          form_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          phone_call_id?: string | null
          source_name?: string | null
          source_type: string
        }
        Update: {
          agent_conversation_id?: string | null
          campaign_id?: string | null
          communication_id?: string | null
          contact_id?: string
          created_at?: string
          event_id?: string | null
          expo_id?: string | null
          form_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          phone_call_id?: string | null
          source_name?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_touchpoints_agent_conversation_id_fkey"
            columns: ["agent_conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_expo_id_fkey"
            columns: ["expo_id"]
            isOneToOne: false
            referencedRelation: "expos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_touchpoints_phone_call_id_fkey"
            columns: ["phone_call_id"]
            isOneToOne: false
            referencedRelation: "phone_calls"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "content_pieces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "event_attendances_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "expo_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expo_contacts_expo_id_fkey"
            columns: ["expo_id"]
            isOneToOne: false
            referencedRelation: "expos"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "expos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "form_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "forms_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          column_mapping: Json | null
          context_campaign_id: string | null
          context_event_id: string | null
          context_expo_id: string | null
          context_form_id: string | null
          created_at: string
          file_name: string
          header_row: number
          id: string
          processed_at: string | null
          result_stats: Json | null
          row_count: number | null
          row_filter: Json | null
          sheet_name: string | null
          source_kind: string | null
          source_name: string
          source_type: string
          status: string
          uploaded_at: string
        }
        Insert: {
          column_mapping?: Json | null
          context_campaign_id?: string | null
          context_event_id?: string | null
          context_expo_id?: string | null
          context_form_id?: string | null
          created_at?: string
          file_name: string
          header_row?: number
          id?: string
          processed_at?: string | null
          result_stats?: Json | null
          row_count?: number | null
          row_filter?: Json | null
          sheet_name?: string | null
          source_kind?: string | null
          source_name: string
          source_type: string
          status?: string
          uploaded_at?: string
        }
        Update: {
          column_mapping?: Json | null
          context_campaign_id?: string | null
          context_event_id?: string | null
          context_expo_id?: string | null
          context_form_id?: string | null
          created_at?: string
          file_name?: string
          header_row?: number
          id?: string
          processed_at?: string | null
          result_stats?: Json | null
          row_count?: number | null
          row_filter?: Json | null
          sheet_name?: string | null
          source_kind?: string | null
          source_name?: string
          source_type?: string
          status?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_context_campaign_id_fkey"
            columns: ["context_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_context_event_id_fkey"
            columns: ["context_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_context_expo_id_fkey"
            columns: ["context_expo_id"]
            isOneToOne: false
            referencedRelation: "expos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_context_form_id_fkey"
            columns: ["context_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "import_rows_normalized_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_normalized_matched_contact_id_fkey"
            columns: ["matched_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_normalized_raw_row_id_fkey"
            columns: ["raw_row_id"]
            isOneToOne: false
            referencedRelation: "import_rows_raw"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "import_rows_raw_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "phone_calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
