// src/app/api/whatsapp/webhook/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { parseWebhookPayload, parseStatusUpdates } from '@/lib/whatsapp/client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: Request) {
  const supabaseAdmin = getAdminClient()
  try {
    const body = await request.json()

    const messages = parseWebhookPayload(body)
    for (const msg of messages) {
      const { data: waConfig } = await supabaseAdmin.from('whatsapp_config').select('org_id').eq('is_active', true).single()
      if (!waConfig) continue

      const formattedFrom = msg.from.startsWith('234') ? '0' + msg.from.slice(3) : msg.from
      const { data: contact } = await supabaseAdmin.from('contacts').select('id, account_id, full_name').eq('org_id', waConfig.org_id)
        .or(`whatsapp_number.eq.${msg.from},whatsapp_number.eq.+${msg.from},phone_number.eq.${msg.from},phone_number.eq.${formattedFrom}`).limit(1).single()

      const interactionData: any = {
        org_id: waConfig.org_id, channel: 'whatsapp', direction: 'inbound',
        subject: `WhatsApp from ${msg.contactName || msg.from}`,
        content: msg.text || `[${msg.type} message]`,
        whatsapp_message_id: msg.messageId,
        created_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      }
      if (contact) { interactionData.account_id = contact.account_id; interactionData.contact_id = contact.id }
      if (interactionData.account_id) await supabaseAdmin.from('interactions').insert(interactionData)

      await supabaseAdmin.from('whatsapp_messages').insert({
        org_id: waConfig.org_id, contact_id: contact?.id, whatsapp_message_id: msg.messageId,
        direction: 'inbound', message_type: msg.type === 'text' ? 'text' : msg.type,
        content: msg.text || `[${msg.type}]`, status: 'delivered',
        sent_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      })

      if (contact?.account_id) {
        const { data: account } = await supabaseAdmin.from('accounts').select('assigned_user_id, name').eq('id', contact.account_id).single()
        if (account?.assigned_user_id) {
          await supabaseAdmin.from('notifications').insert({
            org_id: waConfig.org_id, user_id: account.assigned_user_id, type: 'system',
            title: `New WhatsApp message from ${contact.full_name}`,
            message: (msg.text || '').slice(0, 200) || `[${msg.type} message]`,
            reference_type: 'account', reference_id: contact.account_id, delivery_channel: 'in_app',
          })
        }
      }
    }

    const statuses = parseStatusUpdates(body)
    for (const status of statuses) {
      const updateData: any = { status: status.status }
      if (status.status === 'delivered') updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString()
      else if (status.status === 'read') updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString()
      else if (status.status === 'failed') updateData.error_message = status.errorTitle || 'Delivery failed'
      await supabaseAdmin.from('whatsapp_messages').update(updateData).eq('whatsapp_message_id', status.messageId)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}
