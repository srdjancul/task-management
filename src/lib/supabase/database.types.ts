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
  public: {
    Tables: {
      contacts: {
        Row: {
          approach: Database["public"]["Enums"]["contact_approach"]
          board_rank: number
          company: string
          company_note: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          position: string
          source_url: string | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approach?: Database["public"]["Enums"]["contact_approach"]
          board_rank?: number
          company?: string
          company_note?: string
          created_at?: string
          first_name: string
          id?: string
          last_name?: string
          position?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          approach?: Database["public"]["Enums"]["contact_approach"]
          board_rank?: number
          company?: string
          company_note?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          position?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          block_id: string | null
          created_at: string
          date: string
          done: boolean
          id: string
          rank: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          date: string
          done?: boolean
          id?: string
          rank?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          rank?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "time_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          actual_seconds: number
          category: Database["public"]["Enums"]["block_category"]
          created_at: string
          date: string
          id: string
          planned_minutes: number
          started_at: string | null
          status: Database["public"]["Enums"]["block_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_seconds?: number
          category: Database["public"]["Enums"]["block_category"]
          created_at?: string
          date: string
          id?: string
          planned_minutes: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["block_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          actual_seconds?: number
          category?: Database["public"]["Enums"]["block_category"]
          created_at?: string
          date?: string
          id?: string
          planned_minutes?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["block_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      touches: {
        Row: {
          channel: Database["public"]["Enums"]["touch_channel"]
          contact_id: string
          created_at: string
          direction: Database["public"]["Enums"]["touch_direction"]
          happened_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["touch_channel"]
          contact_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["touch_direction"]
          happened_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["touch_channel"]
          contact_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["touch_direction"]
          happened_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_with_activity"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contacts_with_activity: {
        Row: {
          approach: Database["public"]["Enums"]["contact_approach"] | null
          board_rank: number | null
          company: string | null
          company_note: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          last_touch_at: string | null
          position: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          touch_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      start_time_block: { Args: { block_id: string }; Returns: undefined }
      stop_running_time_blocks: { Args: never; Returns: undefined }
      stop_time_block: { Args: { block_id: string }; Returns: undefined }
    }
    Enums: {
      block_category: "research" | "client_work" | "internal"
      block_status: "planned" | "in_progress" | "done" | "skipped"
      contact_approach: "applied" | "direct"
      contact_status:
        | "to_contact"
        | "contacted"
        | "followed_up"
        | "replied"
        | "in_conversation"
        | "interview"
        | "won"
        | "rejected"
        | "ghosted"
      touch_channel: "email" | "linkedin" | "both"
      touch_direction: "sent" | "received"
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
    Enums: {
      block_category: ["research", "client_work", "internal"],
      block_status: ["planned", "in_progress", "done", "skipped"],
      contact_approach: ["applied", "direct"],
      contact_status: [
        "to_contact",
        "contacted",
        "followed_up",
        "replied",
        "in_conversation",
        "interview",
        "won",
        "rejected",
        "ghosted",
      ],
      touch_channel: ["email", "linkedin", "both"],
      touch_direction: ["sent", "received"],
    },
  },
} as const
