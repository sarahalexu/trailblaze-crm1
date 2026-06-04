// src/middleware.ts
// FIXED: Redirects authenticated users without a profile to /setup
// This catches Google OAuth signups that skip the setup-org flow

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Public paths
  const isPublicPath =
    path === '/' || path === '/login' || path === '/signup' ||
    path === '/forgot-password' || path === '/setup' ||
    path.startsWith('/auth/') || path.startsWith('/api/') ||
    path.startsWith('/_next/') || path === '/favicon.ico' ||
    path === '/sw.js' || path === '/offline.html' ||
    path.startsWith('/legal/') || path.startsWith('/portal/')

  if (isPublicPath) return supabaseResponse

  // Not logged in → login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', path)
    return NextResponse.redirect(url)
  }

  // Logged in going to login/signup → dashboard
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Check if user has a profile (org setup completed)
  // Only check on dashboard routes, not on every single request
  if (path.startsWith('/dashboard') || path.startsWith('/accounts') || path.startsWith('/contacts') ||
      path.startsWith('/interactions') || path.startsWith('/pipeline') || path.startsWith('/tasks') ||
      path.startsWith('/playbooks') || path.startsWith('/reports') || path.startsWith('/settings')) {

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/setup'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
