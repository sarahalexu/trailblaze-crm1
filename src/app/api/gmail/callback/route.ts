// src/app/api/gmail/callback/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=${error || 'no_code'}`)
  }

  try {
    // Read auth ID from cookie we set before the redirect
    const cookieStore = cookies()
    const authId = cookieStore.get('tb_gmail_auth')?.value

    if (!authId) {
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=session_expired`)
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/gmail/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens)
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=token_failed`)
    }

    // Get Gmail address
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()
    const gmailAddress = profile.email

    if (!gmailAddress) {
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=no_email`)
    }

    // Find CRM user
    const { data: crmUser } = await supabaseAdmin
      .from('users')
      .select('id, org_id')
      .eq('auth_id', authId)
      .single()

    if (!crmUser) {
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=user_not_found`)
    }

    // Save connection
    const { error: upsertError } = await supabaseAdmin
      .from('gmail_connections')
      .upsert({
        org_id: crmUser.org_id,
        user_id: crmUser.id,
        gmail_address: gmailAddress,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        sync_enabled: true,
        is_active: true,
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('Gmail save error:', upsertError)
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=save_failed`)
    }

    // Clear the temp cookie and redirect with success
    const response = NextResponse.redirect(
      `${APP_URL}/settings/integrations?gmail=connected&email=${encodeURIComponent(gmailAddress)}`
    )
    response.cookies.delete('tb_gmail_auth')

    // Trigger initial sync (non-blocking)
    fetch(`${APP_URL}/api/gmail/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: crmUser.id }),
    }).catch(() => {})

    return response
  } catch (err: any) {
    console.error('Gmail callback error:', err)
    return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=unknown`)
  }
}