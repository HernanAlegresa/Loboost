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
      body_measurements: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          weight_kg: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          weight_kg?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plan_day_exercises: {
        Row: {
          client_plan_day_id: string
          duration_seconds: number | null
          exercise_id: string
          id: string
          order: number
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number
        }
        Insert: {
          client_plan_day_id: string
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          order: number
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets: number
        }
        Update: {
          client_plan_day_id?: string
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          order?: number
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_day_exercises_client_plan_day_id_fkey"
            columns: ["client_plan_day_id"]
            isOneToOne: false
            referencedRelation: "client_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plan_days: {
        Row: {
          client_plan_id: string
          day_of_week: number
          id: string
          order: number
          week_number: number
        }
        Insert: {
          client_plan_id: string
          day_of_week: number
          id?: string
          order: number
          week_number: number
        }
        Update: {
          client_plan_id?: string
          day_of_week?: number
          id?: string
          order?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_days_client_plan_id_fkey"
            columns: ["client_plan_id"]
            isOneToOne: false
            referencedRelation: "client_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plans: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          end_date: string
          id: string
          name: string
          plan_id: string | null
          start_date: string
          status: string
          weeks: number
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          plan_id?: string | null
          start_date: string
          status?: string
          weeks: number
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          plan_id?: string | null
          start_date?: string
          status?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          age: number | null
          created_at: string
          days_per_week: number | null
          experience_level: string | null
          goal: string | null
          height_cm: number | null
          id: string
          injuries: string | null
          sex: string | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          days_per_week?: number | null
          experience_level?: string | null
          goal?: string | null
          height_cm?: number | null
          id: string
          injuries?: string | null
          sex?: string | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          days_per_week?: number | null
          experience_level?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          sex?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          client_id: string
          coach_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          coach_id: string
          created_at: string
          id: string
          muscle_group: string
          name: string
          type: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          coach_id: string
          created_at?: string
          id?: string
          muscle_group: string
          name: string
          type: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          muscle_group?: string
          name?: string
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          client_id: string
          coach_msgs: boolean
          id: string
          reminders: boolean
          updated_at: string | null
        }
        Insert: {
          client_id: string
          coach_msgs?: boolean
          id?: string
          reminders?: boolean
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          coach_msgs?: boolean
          id?: string
          reminders?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_day_exercises: {
        Row: {
          duration_seconds: number | null
          exercise_id: string
          id: string
          order: number
          plan_day_id: string
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number
        }
        Insert: {
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          order: number
          plan_day_id: string
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets: number
        }
        Update: {
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          order?: number
          plan_day_id?: string
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_day_exercises_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_days: {
        Row: {
          day_of_week: number
          id: string
          order: number
          plan_id: string
          plan_week_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          order: number
          plan_id: string
          plan_week_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          order?: number
          plan_id?: string
          plan_week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_days_plan_week_id_fkey"
            columns: ["plan_week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_weeks: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          week_name: string | null
          week_number: number
          week_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          week_name?: string | null
          week_number: number
          week_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          week_name?: string | null
          week_number?: number
          week_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          weeks: number
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          weeks: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coach_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          client_plan_day_exercise_id: string
          completed: boolean
          duration_seconds: number | null
          id: string
          logged_at: string
          reps_performed: number | null
          session_id: string
          set_number: number
          weight_kg: number | null
        }
        Insert: {
          client_plan_day_exercise_id: string
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          logged_at?: string
          reps_performed?: number | null
          session_id: string
          set_number: number
          weight_kg?: number | null
        }
        Update: {
          client_plan_day_exercise_id?: string
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          logged_at?: string
          reps_performed?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_client_plan_day_exercise_id_fkey"
            columns: ["client_plan_day_exercise_id"]
            isOneToOne: false
            referencedRelation: "client_plan_day_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          client_id: string
          client_plan_day_id: string
          completed_at: string | null
          date: string
          id: string
          notes: string | null
          rpe: number | null
          started_at: string
          status: string
        }
        Insert: {
          client_id: string
          client_plan_day_id: string
          completed_at?: string | null
          date: string
          id?: string
          notes?: string | null
          rpe?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          client_id?: string
          client_plan_day_id?: string
          completed_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          rpe?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_client_plan_day_id_fkey"
            columns: ["client_plan_day_id"]
            isOneToOne: false
            referencedRelation: "client_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
