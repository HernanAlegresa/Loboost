// Este archivo se regenera con: npx supabase gen types typescript --local > src/types/database.ts
// Por ahora usamos un placeholder hasta aplicar la migración

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'coach' | 'client'
          full_name: string | null
          avatar_url: string | null
          coach_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'coach' | 'client'
          full_name?: string | null
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string
        }
        Update: {
          role?: 'coach' | 'client'
          full_name?: string | null
          avatar_url?: string | null
          coach_id?: string | null
        }
      }
    }
  }
}
