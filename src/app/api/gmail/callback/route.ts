// src/app/api/gmail/callback/route.ts
// FIXED: Reads user auth_id from state parameter instead of cookies
// Cookies break during OAuth redirects, state parameter survives

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const stateParam = req.nextUrl.searchParams.get('state')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=${error || 'no_code'}`)
  }

  try {
    // Decode user auth ID from state parameter
    let authId: string | null = null
    if (stateParam) {
      try {
        const stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
        authId = stateData.authId

        // Check timestamp to prevent replay (1 hour window)
        if (stateData.timestamp && Date.now() - stateData.timestamp > 3600000) {
          return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=expired`)
        }
      } catch {
        return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=invalid_state`)
      }
    }

    if (!authId) {
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=no_user`)
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

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()
    const gmailAddress = profile.email

    if (!gmailAddress) {
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=no_email`)
    }

    // Find the CRM user using the auth ID from state
    const { data: crmUser } = await supabaseAdmin
      .from('users')
      .select('id, org_id')
      .eq('auth_id', authId)
      .single()

    if (!crmUser) {
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=user_not_found`)
    }

    // Store or update the Gmail connection
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
      console.error('Failed to save Gmail connection:', upsertError)
      return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=save_failed`)
    }

    // Trigger initial sync (non-blocking)
    fetch(`${APP_URL}/api/gmail/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: crmUser.id }),
    }).catch(() => {})

    return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=connected&email=${encodeURIComponent(gmailAddress)}`)
  } catch (err: any) {
    console.error('Gmail callback error:', err)
    return NextResponse.redirect(`${APP_URL}/settings/integrations?gmail=error&reason=unknown`)
  }
}
