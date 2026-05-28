// src/app/api/gmail/connect/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export async function GET(req: NextRequest) {
  // Get the logged-in user from Supabase auth cookie
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  // Find the Supabase access token cookie
  const sbAccessToken = allCookies.find(c =>
    c.name.includes('auth-token') ||
    c.name.includes('sb-') && c.name.includes('-auth-token')
  )

  let authId: string | null = null

  if (sbAccessToken) {
    // Use the token to get the user
    const { data: { user } } = await supabaseAdmin.auth.getUser(sbAccessToken.value)
    if (user) authId = user.id
  }

  // Fallback: try all sb- cookies to find a valid session
  if (!authId) {
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-') && cookie.value.length > 50) {
        try {
          const { data: { user } } = await supabaseAdmin.auth.getUser(cookie.value)
          if (user) { authId = user.id; break }
        } catch { continue }
      }
    }
  }

  if (!authId) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=not_logged_in`)
  }

  // Set a simple cookie with the auth ID that the callback can read
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${APP_URL}/api/gmail/callback`,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: 'gmail_connect',
    }).toString()}`
  )

  response.cookies.set('tb_gmail_auth', authId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  return response
}