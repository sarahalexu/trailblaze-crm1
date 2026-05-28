// src/app/api/gmail/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getValidToken(connection: any): Promise<string | null> {
  if (connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) return null

  await supabaseAdmin.from('gmail_connections').update({
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
  }).eq('id', connection.id)

  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('id, org_id').eq('auth_id', authUser.id).single()
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: connection } = await supabaseAdmin
      .from('gmail_connections')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    if (!connection) return NextResponse.json({ error: 'Gmail not connected. Go to Settings > Integrations to connect.' }, { status: 400 })

    const accessToken = await getValidToken(connection)
    if (!accessToken) return NextResponse.json({ error: 'Gmail token expired. Please reconnect Gmail.' }, { status: 401 })

    const { to, cc, subject, body, replyToMessageId, threadId, accountId, contactId } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
    }

    // Create email tracking record with unique tracking ID
    const trackingCode = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
    let trackingRecordId: string | null = null
    try {
      const { data: trackingRecord } = await supabaseAdmin.from('email_tracking').insert({
        org_id: profile.org_id,
        tracking_id: trackingCode,
        account_id: accountId || null,
        contact_id: contactId || null,
        recipient_email: Array.isArray(to) ? to[0] : to,
        subject: subject,
        sent_at: new Date().toISOString(),
        open_count: 0,
      }).select('id').single()

      if (trackingRecord) trackingRecordId = trackingRecord.id
    } catch (e) {
      console.error('Email tracking record creation failed:', e)
    }

    // Inject tracking pixel into email body
    let emailBody = body.replace(/\n/g, '<br/>')
    if (trackingRecordId) {
      emailBody += `<img src="${APP_URL}/api/notifications/email-opened?id=${trackingRecordId}" width="1" height="1" style="display:none" />`
    }

    const toHeader = Array.isArray(to) ? to.join(', ') : to
    const ccHeader = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : ''

    let emailLines = [
      `From: ${connection.gmail_address}`,
      `To: ${toHeader}`,
    ]
    if (ccHeader) emailLines.push(`Cc: ${ccHeader}`)
    emailLines.push(`Subject: ${subject}`)
    emailLines.push('Content-Type: text/html; charset=utf-8')
    emailLines.push('MIME-Version: 1.0')
    if (replyToMessageId) {
      emailLines.push(`In-Reply-To: ${replyToMessageId}`)
      emailLines.push(`References: ${replyToMessageId}`)
    }
    emailLines.push('')
    emailLines.push(emailBody)

    const rawEmail = emailLines.join('\r\n')
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const sendBody: any = { raw: encodedEmail }
    if (threadId) sendBody.threadId = threadId

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
    })

    if (!sendRes.ok) {
      const errData = await sendRes.json()
      console.error('Gmail send failed:', errData)
      return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
    }

    const sentData = await sendRes.json()

    // Log as synced email
    try {
      await supabaseAdmin.from('synced_emails').insert({
        org_id: profile.org_id,
        gmail_connection_id: connection.id,
        gmail_message_id: sentData.id,
        gmail_thread_id: sentData.threadId || sentData.id,
        account_id: accountId || null,
        contact_id: contactId || null,
        direction: 'outbound',
        from_address: connection.gmail_address,
        from_name: '',
        to_addresses: JSON.stringify(Array.isArray(to) ? to : [to]),
        cc_addresses: JSON.stringify(cc ? (Array.isArray(cc) ? cc : [cc]) : []),
        subject,
        body_preview: body.replace(/<[^>]*>/g, '').slice(0, 500),
        body_html: emailBody,
        has_attachments: false,
        is_read: true,
        labels: JSON.stringify(['SENT']),
        sent_at: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Failed to log synced email:', e)
    }

    // Log as interaction
    try {
      await supabaseAdmin.from('interactions').insert({
        org_id: profile.org_id,
        account_id: accountId || null,
        contact_id: contactId || null,
        user_id: profile.id,
        channel: 'email',
        direction: 'outbound',
        subject,
        content: body.replace(/<[^>]*>/g, '').slice(0, 2000),
      })
    } catch (e) {
      console.error('Failed to log interaction:', e)
    }

    // Link tracking record to the interaction
    if (trackingRecordId) {
      try {
        // Get the interaction we just created to link them
        const { data: lastInteraction } = await supabaseAdmin.from('interactions')
          .select('id')
          .eq('org_id', profile.org_id)
          .eq('user_id', profile.id)
          .eq('channel', 'email')
          .eq('subject', subject)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastInteraction) {
          await supabaseAdmin.from('email_tracking').update({
            interaction_id: lastInteraction.id,
          }).eq('id', trackingRecordId)
        }
      } catch (e) {
        console.error('Failed to link tracking:', e)
      }
    }

    return NextResponse.json({ success: true, messageId: sentData.id, threadId: sentData.threadId })
  } catch (err: any) {
    console.error('Send email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}