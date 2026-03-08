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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string | null
          payload_json: Json | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id?: string | null
          payload_json?: Json | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          payload_json?: Json | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booked_at: string | null
          campaign_id: string | null
          created_at: string
          estimated_value: number | null
          id: string
          lead_id: string
          workspace_id: string
        }
        Insert: {
          booked_at?: string | null
          campaign_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          lead_id: string
          workspace_id: string
        }
        Update: {
          booked_at?: string | null
          campaign_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          lead_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channels_json: Json | null
          created_at: string
          created_by: string | null
          id: string
          lead_count: number | null
          name: string
          offer_json: Json | null
          playbook_id: string | null
          playbook_type: string | null
          segment_json: Json | null
          status: Database["public"]["Enums"]["campaign_status"]
          workspace_id: string
        }
        Insert: {
          channels_json?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_count?: number | null
          name: string
          offer_json?: Json | null
          playbook_id?: string | null
          playbook_type?: string | null
          segment_json?: Json | null
          status?: Database["public"]["Enums"]["campaign_status"]
          workspace_id: string
        }
        Update: {
          channels_json?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_count?: number | null
          name?: string
          offer_json?: Json | null
          playbook_id?: string | null
          playbook_type?: string | null
          segment_json?: Json | null
          status?: Database["public"]["Enums"]["campaign_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          best_angle: string | null
          best_channel: string | null
          closed_lost_reason: string | null
          company: string | null
          consent_status: string | null
          created_at: string
          do_not_contact: boolean | null
          email: string | null
          enriched_at: string | null
          enrichment_json: Json | null
          first_name: string | null
          id: string
          jurisdiction: string | null
          last_activity_at: string | null
          last_contacted_at: string | null
          last_name: string | null
          lead_value: number | null
          no_show_flag: boolean | null
          notes: string | null
          phone: string | null
          revival_bucket: Database["public"]["Enums"]["revival_bucket"] | null
          revival_score: number | null
          risk_flag: string | null
          source: string | null
          stage: string | null
          status: string | null
          suggested_cta: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          best_angle?: string | null
          best_channel?: string | null
          closed_lost_reason?: string | null
          company?: string | null
          consent_status?: string | null
          created_at?: string
          do_not_contact?: boolean | null
          email?: string | null
          enriched_at?: string | null
          enrichment_json?: Json | null
          first_name?: string | null
          id?: string
          jurisdiction?: string | null
          last_activity_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          lead_value?: number | null
          no_show_flag?: boolean | null
          notes?: string | null
          phone?: string | null
          revival_bucket?: Database["public"]["Enums"]["revival_bucket"] | null
          revival_score?: number | null
          risk_flag?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          suggested_cta?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          best_angle?: string | null
          best_channel?: string | null
          closed_lost_reason?: string | null
          company?: string | null
          consent_status?: string | null
          created_at?: string
          do_not_contact?: boolean | null
          email?: string | null
          enriched_at?: string | null
          enrichment_json?: Json | null
          first_name?: string | null
          id?: string
          jurisdiction?: string | null
          last_activity_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          lead_value?: number | null
          no_show_flag?: boolean | null
          notes?: string | null
          phone?: string | null
          revival_bucket?: Database["public"]["Enums"]["revival_bucket"] | null
          revival_score?: number | null
          risk_flag?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          suggested_cta?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_rationale: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_by: string | null
          body: string
          campaign_id: string | null
          channel: Database["public"]["Enums"]["message_channel"]
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          lead_id: string
          opened_at: string | null
          replied_at: string | null
          sent_at: string | null
          subject: string | null
          workspace_id: string
        }
        Insert: {
          ai_rationale?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          body: string
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["message_channel"]
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          subject?: string | null
          workspace_id: string
        }
        Update: {
          ai_rationale?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          body?: string
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["message_channel"]
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          active: boolean | null
          channels: Json | null
          created_at: string
          cta: string | null
          id: string
          name: string
          prompt_template: string | null
          sequence_json: Json | null
          tone: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          active?: boolean | null
          channels?: Json | null
          created_at?: string
          cta?: string | null
          id?: string
          name: string
          prompt_template?: string | null
          sequence_json?: Json | null
          tone?: string | null
          type: string
          workspace_id: string
        }
        Update: {
          active?: boolean | null
          channels?: Json | null
          created_at?: string
          cta?: string | null
          id?: string
          name?: string
          prompt_template?: string | null
          sequence_json?: Json | null
          tone?: string | null
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          jurisdiction: string | null
          lead_id: string
          reason: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          jurisdiction?: string | null
          lead_id: string
          reason: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          jurisdiction?: string | null
          lead_id?: string
          reason?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppressions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppressions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          plan?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
      approval_status: "pending" | "approved" | "rejected" | "edited"
      campaign_status: "draft" | "active" | "paused" | "completed"
      message_channel: "email" | "sms"
      revival_bucket:
        | "revive_now"
        | "review_first"
        | "nurture_later"
        | "suppress"
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
  public: {
    Enums: {
      app_role: ["admin", "member", "viewer"],
      approval_status: ["pending", "approved", "rejected", "edited"],
      campaign_status: ["draft", "active", "paused", "completed"],
      message_channel: ["email", "sms"],
      revival_bucket: [
        "revive_now",
        "review_first",
        "nurture_later",
        "suppress",
      ],
    },
  },
} as const
