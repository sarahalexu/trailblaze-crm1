// src/app/api/whatsapp/send/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { rateLimit } from '@/lib/security'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`wa-send-${user.id}`, 30, 60000)
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  const { data: profile } = await supabase.from('users').select('id, org_id, role').eq('auth_id', user.id).single()
  if (!profile || profile.role === 'viewer') return NextResponse.json({ error: 'Viewers cannot send messages' }, { status: 403 })

  const { contactId, accountId, message, type = 'text', templateName } = await request.json()
  if (!message && type === 'text') return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const supabaseAdmin = getAdminClient()

  const { data: waConfig } = await supabaseAdmin.from('whatsapp_config').select('*').eq('org_id', profile.org_id).single()
  if (!waConfig?.is_active || !waConfig.access_token) return NextResponse.json({ error: 'WhatsApp not configured.' }, { status: 400 })
  if (waConfig.monthly_message_count >= waConfig.monthly_message_limit) return NextResponse.json({ error: 'Monthly limit reached.' }, { status: 429 })

  const { data: contact } = await supabaseAdmin.from('contacts').select('id, full_name, whatsapp_number, phone_number, account_id').eq('id', contactId).single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const recipientNumber = contact.whatsapp_number || contact.phone_number
  if (!recipientNumber) return NextResponse.json({ error: 'Contact has no WhatsApp number' }, { status: 400 })

  const result = await sendWhatsAppMessage({
    phoneNumberId: waConfig.phone_number_id, accessToken: waConfig.access_token,
    to: recipientNumber, message, type: type as 'text' | 'template', templateName,
  })
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await supabaseAdmin.from('interactions').insert({
    account_id: accountId || contact.account_id, contact_id: contactId, org_id: profile.org_id,
    user_id: profile.id, channel: 'whatsapp', direction: 'outbound',
    subject: `WhatsApp to ${contact.full_name}`, content: message, whatsapp_message_id: result.messageId,
  })

  await supabaseAdmin.from('whatsapp_messages').insert({
    org_id: profile.org_id, contact_id: contactId, whatsapp_message_id: result.messageId,
    direction: 'outbound', message_type: type, content: message, template_name: templateName, status: 'sent',
  })

  await supabaseAdmin.from('whatsapp_config').update({ monthly_message_count: waConfig.monthly_message_count + 1 }).eq('id', waConfig.id)

  await supabaseAdmin.from('audit_log').insert({
    org_id: profile.org_id, user_id: profile.id, action: 'created',
    entity_type: 'whatsapp_message', entity_id: result.messageId,
    changes: { to: recipientNumber, contact: contact.full_name },
  })

  return NextResponse.json({ success: true, messageId: result.messageId })
}
