// src/app/api/gmail/connect/route.ts
// Initiates Gmail OAuth flow - redirects user to Google consent screen

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export async function GET(req: NextRequest) {
  // Build Google OAuth URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/gmail/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: 'gmail_connect',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
