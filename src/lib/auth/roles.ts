import { createClient } from '@/lib/supabase/server'

export type Role = 'coach' | 'client'

export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return null
  return profile.role as Role
}

export function isCoach(role: Role | null): role is 'coach' {
  return role === 'coach'
}

export function isClient(role: Role | null): role is 'client' {
  return role === 'client'
}
