import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const PUBLIC_ROUTES = ['/login', '/register']
const COACH_PREFIX = '/coach'
const CLIENT_PREFIX = '/client'

async function getRoleFromRequest(
  request: NextRequest
): Promise<'coach' | 'client' | null> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = data as { role: 'coach' | 'client' } | null
  return profile?.role ?? null
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  if (isPublicRoute) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isCoachRoute = pathname.startsWith(COACH_PREFIX)
  const isClientRoute = pathname.startsWith(CLIENT_PREFIX)

  if (isCoachRoute || isClientRoute) {
    const role = await getRoleFromRequest(request)

    if (isCoachRoute && role !== 'coach') {
      return NextResponse.redirect(new URL('/client/dashboard', request.url))
    }
    if (isClientRoute && role !== 'client') {
      return NextResponse.redirect(new URL('/coach/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
