// src/app/api/notifications/email-opened/route.ts
// Tracking pixel endpoint - updates open count and creates notification

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

function pixelResponse() {
  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

// GET - called by the tracking pixel in the email
export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get('id')

  if (!trackingId) return pixelResponse()

  try {
    // Look up the tracking record
    const { data: tracking } = await supabaseAdmin
      .from('email_tracking')
      .select('*, contact:contacts(full_name), account:accounts(id, name)')
      .eq('id', trackingId)
      .single()

    if (!tracking) return pixelResponse()

    // Update open count
    const isFirstOpen = tracking.open_count === 0
    await supabaseAdmin.from('email_tracking').update({
      open_count: (tracking.open_count || 0) + 1,
      first_opened_at: isFirstOpen ? new Date().toISOString() : tracking.first_opened_at,
      last_opened_at: new Date().toISOString(),
      user_agent: req.headers.get('user-agent') || null,
    }).eq('id', tracking.id)

    // Create notification on first open
    if (isFirstOpen) {
      // Find who to notify: look up the gmail connection for this org
      const { data: gmailConn } = await supabaseAdmin
        .from('gmail_connections')
        .select('user_id')
        .eq('org_id', tracking.org_id)
        .eq('is_active', true)
        .limit(1)
        .single()

      // Fallback: find via the linked interaction
      let notifyUserId = gmailConn?.user_id || null
      if (!notifyUserId && tracking.interaction_id) {
        const { data: interaction } = await supabaseAdmin
          .from('interactions')
          .select('user_id')
          .eq('id', tracking.interaction_id)
          .single()
        notifyUserId = interaction?.user_id || null
      }

      if (notifyUserId) {
        const contactName = tracking.contact?.full_name || tracking.recipient_email || 'Someone'
        const accountName = tracking.account?.name || ''

        try {
          await supabaseAdmin.from('notifications').insert({
            user_id: notifyUserId,
            org_id: tracking.org_id,
            type: 'email_opened',
            title: `${contactName} opened your email`,
            message: `"${tracking.subject || 'No subject'}"${accountName ? ` (${accountName})` : ''}`,
            reference_type: tracking.account_id ? 'account' : null,
            reference_id: tracking.account_id || null,
          })
        } catch (e) {
          console.error('Failed to create notification:', e)
        }
      }
    }
  } catch (err) {
    console.error('Email tracking error:', err)
  }

  // Always return the pixel, even if tracking fails
  return pixelResponse()
}

// POST - alternative endpoint for webhook-style calls
export async function POST(req: NextRequest) {
  try {
    const { trackingId, emailId } = await req.json()
    const id = trackingId || emailId
    if (!id) return NextResponse.json({ error: 'trackingId required' }, { status: 400 })

    // Reuse the same logic by creating a fake request to the GET handler
    const url = new URL(req.url)
    url.searchParams.set('id', id)
    const fakeReq = new NextRequest(url)
    await GET(fakeReq)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}