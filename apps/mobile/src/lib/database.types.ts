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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      care_links: {
        Row: {
          clinician_id: string
          created_at: string
          patient_id: string
        }
        Insert: {
          clinician_id: string
          created_at?: string
          patient_id: string
        }
        Update: {
          clinician_id?: string
          created_at?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_links_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          input_mode: string
          local_date: string
          patient_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          input_mode?: string
          local_date: string
          patient_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          input_mode?: string
          local_date?: string
          patient_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_entries: {
        Row: {
          checkin_id: string
          created_at: string
          custom_label: string | null
          id: string
          severity: number
          symptom_code: string | null
          updated_at: string
        }
        Insert: {
          checkin_id: string
          created_at?: string
          custom_label?: string | null
          id?: string
          severity: number
          symptom_code?: string | null
          updated_at?: string
        }
        Update: {
          checkin_id?: string
          created_at?: string
          custom_label?: string | null
          id?: string
          severity?: number
          symptom_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_entries_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_entries_symptom_code_fkey"
            columns: ["symptom_code"]
            isOneToOne: false
            referencedRelation: "symptom_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      checkins: {
        Row: {
          created_at: string
          day: string
          id: string
          note: string | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          note?: string | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          note?: string | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      context_checks: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          patient_id: string
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          patient_id: string
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          patient_id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_checks_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_checks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_events: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          rule: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          rule: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          rule?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_feedback: {
        Row: {
          clinician_id: string
          created_at: string
          decision: string
          insight_id: string
        }
        Insert: {
          clinician_id?: string
          created_at?: string
          decision: string
          insight_id: string
        }
        Update: {
          clinician_id?: string
          created_at?: string
          decision?: string
          insight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_feedback_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_feedback_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: true
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          context_check_id: string
          created_at: string
          custom_label: string | null
          evidence: Json
          id: string
          kind: string
          patient_id: string
          rank: number
          summary: string
          symptom_code: string | null
          title: string
        }
        Insert: {
          context_check_id: string
          created_at?: string
          custom_label?: string | null
          evidence?: Json
          id?: string
          kind: string
          patient_id: string
          rank: number
          summary: string
          symptom_code?: string | null
          title: string
        }
        Update: {
          context_check_id?: string
          created_at?: string
          custom_label?: string | null
          evidence?: Json
          id?: string
          kind?: string
          patient_id?: string
          rank?: number
          summary?: string
          symptom_code?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_context_check_id_fkey"
            columns: ["context_check_id"]
            isOneToOne: false
            referencedRelation: "context_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_symptom_code_fkey"
            columns: ["symptom_code"]
            isOneToOne: false
            referencedRelation: "symptom_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      interviews: {
        Row: {
          clinician_id: string
          content: string
          created_at: string
          extracted: Json | null
          id: string
          kind: string
          patient_id: string
          visit_at: string
        }
        Insert: {
          clinician_id?: string
          content: string
          created_at?: string
          extracted?: Json | null
          id?: string
          kind: string
          patient_id: string
          visit_at: string
        }
        Update: {
          clinician_id?: string
          content?: string
          created_at?: string
          extracted?: Json | null
          id?: string
          kind?: string
          patient_id?: string
          visit_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          failed_attempts: number
          patient_id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          failed_attempts?: number
          patient_id: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          failed_attempts?: number
          patient_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_codes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_plans: {
        Row: {
          created_at: string
          patient_id: string
          symptom_codes: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          patient_id: string
          symptom_codes?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          patient_id?: string
          symptom_codes?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          created_at: string
          custom_label: string | null
          details: Json | null
          duration_days: number | null
          id: string
          observed_on: string
          patient_id: string
          severity: number | null
          source: string
          source_message_id: string | null
          symptom_code: string | null
        }
        Insert: {
          created_at?: string
          custom_label?: string | null
          details?: Json | null
          duration_days?: number | null
          id?: string
          observed_on: string
          patient_id: string
          severity?: number | null
          source: string
          source_message_id?: string | null
          symptom_code?: string | null
        }
        Update: {
          created_at?: string
          custom_label?: string | null
          details?: Json | null
          duration_days?: number | null
          id?: string
          observed_on?: string
          patient_id?: string
          severity?: number | null
          source?: string
          source_message_id?: string | null
          symptom_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_symptom_code_fkey"
            columns: ["symptom_code"]
            isOneToOne: false
            referencedRelation: "symptom_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          answer: string
          created_at: string
          patient_id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          patient_id: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          patient_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_answers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_band: string | null
          created_at: string
          display_name: string | null
          hrt_status: string | null
          id: string
          last_period: string | null
          locale: string
          menopause_stage: string | null
          onboarding_completed_at: string | null
          reminder_enabled: boolean
          reminder_time: string
          role: string
          text_size: string
          timezone: string
          updated_at: string
        }
        Insert: {
          age_band?: string | null
          created_at?: string
          display_name?: string | null
          hrt_status?: string | null
          id: string
          last_period?: string | null
          locale?: string
          menopause_stage?: string | null
          onboarding_completed_at?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          role?: string
          text_size?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          age_band?: string | null
          created_at?: string
          display_name?: string | null
          hrt_status?: string | null
          id?: string
          last_period?: string | null
          locale?: string
          menopause_stage?: string | null
          onboarding_completed_at?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          role?: string
          text_size?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      symptom_catalog: {
        Row: {
          code: string
          is_default: boolean
          label: string
          sort: number
        }
        Insert: {
          code: string
          is_default?: boolean
          label: string
          sort?: number
        }
        Update: {
          code?: string
          is_default?: boolean
          label?: string
          sort?: number
        }
        Relationships: []
      }
      wearable_connections: {
        Row: {
          connected_at: string
          last_synced_at: string | null
          patient_id: string
          provider: string
        }
        Insert: {
          connected_at?: string
          last_synced_at?: string | null
          patient_id: string
          provider: string
        }
        Update: {
          connected_at?: string
          last_synced_at?: string | null
          patient_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "wearable_connections_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_nights: {
        Row: {
          awakenings: number | null
          created_at: string
          id: string
          night_of: string
          patient_id: string
          provider: string
          resting_hr: number | null
          skin_temp_delta_c: number | null
          sleep_minutes: number | null
          warm_at: string | null
        }
        Insert: {
          awakenings?: number | null
          created_at?: string
          id?: string
          night_of: string
          patient_id: string
          provider: string
          resting_hr?: number | null
          skin_temp_delta_c?: number | null
          sleep_minutes?: number | null
          warm_at?: string | null
        }
        Update: {
          awakenings?: number | null
          created_at?: string
          id?: string
          night_of?: string
          patient_id?: string
          provider?: string
          resting_hr?: number | null
          skin_temp_delta_c?: number | null
          sleep_minutes?: number | null
          warm_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_nights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_link_code: {
        Args: never
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      redeem_link_code: { Args: { p_code: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
