// src/app/api/gmail/sync/route.ts
// Syncs emails from Gmail, matches to contacts by email address

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshAccessToken(connection: any): Promise<string | null> {
  try {
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

    await supabaseAdmin
      .from('gmail_connections')
      .update({
        access_token: data.access_token,
        token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
      })
      .eq('id', connection.id)

    return data.access_token
  } catch {
    return null
  }
}

function extractEmail(header: string): string {
  const match = header.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : header.toLowerCase().trim()
}

function extractName(header: string): string {
  const match = header.match(/^([^<]+)</)
  return match ? match[1].trim().replace(/"/g, '') : ''
}

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64)
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.userId

    // Get connections to sync
    let query = supabaseAdmin
      .from('gmail_connections')
      .select('*')
      .eq('is_active', true)
      .eq('sync_enabled', true)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: connections } = await query
    if (!connections || connections.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No active Gmail connections' })
    }

    let totalSynced = 0

    for (const conn of connections) {
      // Check if token needs refresh
      let accessToken = conn.access_token
      if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
        accessToken = await refreshAccessToken(conn)
        if (!accessToken) {
          console.error(`Failed to refresh token for connection ${conn.id}`)
          continue
        }
      }

      // Get all contacts with emails for this org (for matching)
      const { data: orgContacts } = await supabaseAdmin
        .from('contacts')
        .select('id, email, account_id')
        .eq('org_id', conn.org_id)
        .not('email', 'is', null)

      const contactsByEmail = new Map<string, { id: string; account_id: string }>()
      for (const c of orgContacts || []) {
        if (c.email) contactsByEmail.set(c.email.toLowerCase(), { id: c.id, account_id: c.account_id })
      }

      // Fetch recent emails from Gmail
      const sinceDate = conn.last_sync_at
        ? new Date(conn.last_sync_at)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const afterEpoch = Math.floor(sinceDate.getTime() / 1000)
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=after:${afterEpoch}`

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!listRes.ok) {
        console.error(`Gmail list failed for ${conn.gmail_address}:`, await listRes.text())
        continue
      }

      const listData = await listRes.json()
      const messageIds = listData.messages || []

      for (const msg of messageIds) {
        // Check if already synced
        const { data: existing } = await supabaseAdmin
          .from('synced_emails')
          .select('id')
          .eq('org_id', conn.org_id)
          .eq('gmail_message_id', msg.id)
          .single()

        if (existing) continue

        // Fetch full message
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!msgRes.ok) continue
        const msgData = await msgRes.json()

        const headers = msgData.payload?.headers || []
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

        const fromHeader = getHeader('From')
        const toHeader = getHeader('To')
        const ccHeader = getHeader('Cc')
        const subject = getHeader('Subject')
        const dateHeader = getHeader('Date')

        const fromEmail = extractEmail(fromHeader)
        const fromName = extractName(fromHeader)
        const isOutbound = fromEmail.toLowerCase() === conn.gmail_address.toLowerCase()

        // Parse to/cc
        const toAddresses = toHeader.split(',').map((a: string) => extractEmail(a)).filter(Boolean)
        const ccAddresses = ccHeader ? ccHeader.split(',').map((a: string) => extractEmail(a)).filter(Boolean) : []

        // Match to contact
        const matchEmail = isOutbound
          ? toAddresses.find((e: string) => contactsByEmail.has(e))
          : contactsByEmail.has(fromEmail) ? fromEmail : null

        const matchedContact = matchEmail ? contactsByEmail.get(matchEmail) : null

        // Extract body preview
        let bodyPreview = msgData.snippet || ''
        let bodyHtml = ''

        // Try to get HTML body
        function findPart(parts: any[], mimeType: string): any {
          for (const part of parts) {
            if (part.mimeType === mimeType && part.body?.data) return part
            if (part.parts) {
              const found = findPart(part.parts, mimeType)
              if (found) return found
            }
          }
          return null
        }

        if (msgData.payload?.parts) {
          const htmlPart = findPart(msgData.payload.parts, 'text/html')
          if (htmlPart?.body?.data) bodyHtml = decodeBase64Url(htmlPart.body.data)
        } else if (msgData.payload?.body?.data) {
          bodyHtml = decodeBase64Url(msgData.payload.body.data)
        }

        const hasAttachments = (msgData.payload?.parts || []).some((p: any) =>
          p.filename && p.filename.length > 0
        )

        const sentAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()

        // Insert synced email
        const { error: insertError } = await supabaseAdmin.from('synced_emails').insert({
          org_id: conn.org_id,
          gmail_connection_id: conn.id,
          gmail_message_id: msg.id,
          gmail_thread_id: msg.threadId,
          account_id: matchedContact?.account_id || null,
          contact_id: matchedContact?.id || null,
          direction: isOutbound ? 'outbound' : 'inbound',
          from_address: fromEmail,
          from_name: fromName,
          to_addresses: JSON.stringify(toAddresses),
          cc_addresses: JSON.stringify(ccAddresses),
          subject,
          body_preview: bodyPreview.slice(0, 500),
          body_html: bodyHtml.slice(0, 50000),
          has_attachments: hasAttachments,
          is_read: !(msgData.labelIds || []).includes('UNREAD'),
          labels: JSON.stringify(msgData.labelIds || []),
          sent_at: sentAt,
        })

        if (!insertError) totalSynced++
      }

      // Update last sync time
      await supabaseAdmin
        .from('gmail_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', conn.id)
    }

    return NextResponse.json({ synced: totalSynced, connections: connections.length })
  } catch (err: any) {
    console.error('Gmail sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
