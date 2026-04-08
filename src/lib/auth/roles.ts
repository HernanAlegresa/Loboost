import { createClient } from '@/lib/supabase/server'

export type Role = 'coach' | 'client'

export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile?.role as Role) ?? null
}

export function isCoach(role: Role | null): role is 'coach' {
  return role === 'coach'
}

export function isClient(role: Role | null): role is 'client' {
  return role === 'client'
}
