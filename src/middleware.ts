import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh the session - this is critical for auth to work
  const { data: { session } } = await supabase.auth.getSession()
  
  const path = req.nextUrl.pathname
  
  // These paths must NEVER be blocked
  const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/auth/callback',
    '/auth/confirm',
    '/api/',
    '/_next/',
    '/favicon.ico',
    '/sw.js',
    '/offline.html',
  ]
  
  // Allow all public paths through
  if (publicPaths.some(p => path.startsWith(p)) || path === '/') {
    return res
  }
  
  // If not logged in and trying to access protected route, redirect to login
  if (!session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }
  
  // If logged in and trying to access login/signup, redirect to dashboard
  if (session && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
}