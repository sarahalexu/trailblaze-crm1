// src/app/api/notifications/email-opened/route.ts
// Called by email tracking pixel or webhook when an email is opened
// Creates a notification for the sender

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { trackingId, emailId } = await req.json()

    // Look up the email tracking record
    const { data: tracking } = await supabaseAdmin
      .from('email_tracking')
      .select('*, contact:contacts(full_name), account:accounts(id, name)')
      .eq('id', trackingId || emailId)
      .single()

    if (!tracking) {
      return NextResponse.json({ error: 'Tracking record not found' }, { status: 404 })
    }

    // Update tracking counts
    const isFirstOpen = tracking.open_count === 0
    await supabaseAdmin.from('email_tracking').update({
      open_count: (tracking.open_count || 0) + 1,
      first_opened_at: isFirstOpen ? new Date().toISOString() : tracking.first_opened_at,
      last_opened_at: new Date().toISOString(),
    }).eq('id', tracking.id)

    // Only notify on first open
    if (isFirstOpen && tracking.user_id) {
      const contactName = tracking.contact?.full_name || tracking.recipient_email || 'Someone'
      const accountName = tracking.account?.name || ''

      await supabaseAdmin.from('notifications').insert({
        user_id: tracking.user_id,
        org_id: tracking.org_id,
        type: 'email_opened',
        title: `${contactName} opened your email`,
        message: `"${tracking.subject || 'No subject'}"${accountName ? ` (${accountName})` : ''}`,
        reference_type: tracking.account_id ? 'account' : null,
        reference_id: tracking.account_id || null,
      })
    }

    return NextResponse.json({ success: true, firstOpen: isFirstOpen })
  } catch (err: any) {
    console.error('Email open notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET endpoint for tracking pixel (1x1 transparent GIF)
export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get('id')
  if (trackingId) {
    // Fire and forget the notification
    fetch(req.nextUrl.origin + '/api/notifications/email-opened', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingId }),
    }).catch(() => {})
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
