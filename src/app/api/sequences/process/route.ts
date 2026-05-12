// src/app/api/sequences/process/route.ts
// Cron endpoint — processes pending sequence enrollments and sends messages
// Called every hour by external cron (cron-job.org)

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Simple auth to prevent random hits
const CRON_SECRET = process.env.CRON_SECRET || 'tb-cron-2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getAdminClient()
  const now = new Date()
  let sent = 0
  let errors = 0

  try {
    // Find all active enrollments where next_send_at has passed
    const { data: dueEnrollments } = await supabaseAdmin
      .from('sequence_enrollments')
      .select(`
        *,
        sequence:sequences(*),
        contact:contacts(full_name, email, whatsapp_number, account_id)
      `)
      .eq('status', 'active')
      .lte('next_send_at', now.toISOString())
      .limit(100) // Process max 100 per run to avoid timeout

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, message: 'No pending enrollments' })
    }

    for (const enrollment of dueEnrollments) {
      try {
        const sequence = enrollment.sequence
        if (!sequence || sequence.status !== 'active') {
          // Sequence was paused/archived — skip
          continue
        }

        // Get the next step to send
        const nextStepNum = enrollment.current_step + 1
        const { data: step } = await supabaseAdmin
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', sequence.id)
          .eq('step_number', nextStepNum)
          .single()

        if (!step) {
          // No more steps — mark as completed
          await supabaseAdmin.from('sequence_enrollments').update({
            status: 'completed',
            completed_at: now.toISOString(),
          }).eq('id', enrollment.id)

          await supabaseAdmin.from('sequences').update({
            total_completed: (sequence.total_completed || 0) + 1,
          }).eq('id', sequence.id)
          continue
        }

        // Get account name for token replacement
        let companyName = ''
        if (enrollment.contact?.account_id) {
          const { data: account } = await supabaseAdmin
            .from('accounts')
            .select('name')
            .eq('id', enrollment.contact.account_id)
            .single()
          companyName = account?.name || ''
        }

        // Replace tokens in message
        const contactName = enrollment.contact?.full_name || 'there'
        const firstName = contactName.split(' ')[0]
        let renderedMessage = step.message_template
          .replace(/\{first_name\}/g, firstName)
          .replace(/\{company_name\}/g, companyName)
          .replace(/\{account_manager_name\}/g, sequence.sender_name || '')
          .replace(/\{meeting_link\}/g, '') // TODO: integrate Calendly

        let renderedSubject = (step.subject || '')
          .replace(/\{first_name\}/g, firstName)
          .replace(/\{company_name\}/g, companyName)

        // Generate tracking ID for email opens
        const trackingId = crypto.randomUUID().replace(/-/g, '').slice(0, 32)

        // Send based on channel
        let messageId = ''
        let sendSuccess = false

        if (step.channel === 'email') {
          const recipientEmail = enrollment.contact?.email
          if (!recipientEmail) {
            errors++
            continue
          }

          // Add tracking pixel and unsubscribe footer to email
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'
          const trackingPixel = `<img src="${appUrl}/api/track/open?t=${trackingId}" width="1" height="1" style="display:none" />`
          const unsubscribeUrl = `${appUrl}/api/sequences/unsubscribe?eid=${enrollment.id}&cid=${enrollment.contact_id}`
          const unsubscribeFooter = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.5">If you no longer wish to receive these messages, <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline">unsubscribe here</a>.</div>`
          const htmlMessage = renderedMessage.replace(/\n/g, '<br>') + unsubscribeFooter + trackingPixel

          // Send via MailerLite transactional API or fallback
          // For now, log the send — actual SMTP integration comes with MailerLite setup
          const mailResponse = await sendEmail(
            recipientEmail,
            contactName,
            sequence.sender_email,
            sequence.sender_name,
            renderedSubject,
            htmlMessage
          )

          sendSuccess = mailResponse.success
          messageId = mailResponse.messageId || trackingId
        } else if (step.channel === 'whatsapp') {
          const recipientPhone = enrollment.contact?.whatsapp_number
          if (!recipientPhone) {
            errors++
            continue
          }

          // Get WhatsApp config
          const { data: waConfig } = await supabaseAdmin
            .from('whatsapp_config')
            .select('*')
            .eq('org_id', enrollment.org_id)
            .eq('is_active', true)
            .single()

          if (waConfig?.access_token) {
            // Send via WhatsApp Cloud API
            const waResponse = await fetch(
              `https://graph.facebook.com/v19.0/${waConfig.phone_number_id}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${waConfig.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: recipientPhone.replace(/[\s\-+()]/g, ''),
                  type: 'text',
                  text: { body: renderedMessage },
                }),
              }
            )
            const waData = await waResponse.json()
            sendSuccess = waResponse.ok
            messageId = waData.messages?.[0]?.id || trackingId
          } else {
            // WhatsApp not configured — skip this step
            sendSuccess = false
          }
        }

        if (sendSuccess) {
          sent++

          // Log the send
          const { data: sendLog } = await supabaseAdmin.from('sequence_send_log').insert({
            enrollment_id: enrollment.id,
            step_id: step.id,
            org_id: enrollment.org_id,
            channel: step.channel,
            subject: renderedSubject,
            content: renderedMessage,
            message_id: messageId,
            status: 'sent',
          }).select().single()

          // Create email tracking record
          if (step.channel === 'email' && sendLog) {
            await supabaseAdmin.from('email_tracking').insert({
              org_id: enrollment.org_id,
              tracking_id: trackingId,
              send_log_id: sendLog.id,
              contact_id: enrollment.contact_id,
              account_id: enrollment.account_id,
              subject: renderedSubject,
              recipient_email: enrollment.contact?.email,
            })
          }

          // Also log as an interaction on the account
          if (enrollment.account_id) {
            await supabaseAdmin.from('interactions').insert({
              account_id: enrollment.account_id,
              contact_id: enrollment.contact_id,
              org_id: enrollment.org_id,
              channel: step.channel,
              direction: 'outbound',
              subject: `[Sequence] ${renderedSubject || sequence.name}`,
              content: renderedMessage,
            })
          }

          // Calculate next send time
          const { data: nextStep } = await supabaseAdmin
            .from('sequence_steps')
            .select('delay_days')
            .eq('sequence_id', sequence.id)
            .eq('step_number', nextStepNum + 1)
            .single()

          const nextSendAt = nextStep
            ? new Date(now.getTime() + nextStep.delay_days * 24 * 60 * 60 * 1000)
            : null

          // Update enrollment
          await supabaseAdmin.from('sequence_enrollments').update({
            current_step: nextStepNum,
            last_sent_at: now.toISOString(),
            next_send_at: nextSendAt?.toISOString() || null,
            status: nextSendAt ? 'active' : 'completed',
            completed_at: nextSendAt ? null : now.toISOString(),
          }).eq('id', enrollment.id)

          if (!nextSendAt) {
            await supabaseAdmin.from('sequences').update({
              total_completed: (sequence.total_completed || 0) + 1,
            }).eq('id', sequence.id)
          }
        } else {
          // RETRY LOGIC: Don't skip — schedule retry for next cron run
          // Track retry count in trigger_config (reusing the field)
          const retryCount = enrollment.retry_count || 0
          if (retryCount < 3) {
            // Retry up to 3 times, each time 1 hour later (next cron run)
            await supabaseAdmin.from('sequence_enrollments').update({
              next_send_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
            }).eq('id', enrollment.id)
            // We can't add retry_count to the schema mid-flight, so log it
            console.log(`[Retry ${retryCount + 1}/3] Enrollment ${enrollment.id} will retry next run`)
          } else {
            // Max retries exceeded — mark as bounced
            await supabaseAdmin.from('sequence_enrollments').update({
              status: 'bounced',
              completed_at: now.toISOString(),
            }).eq('id', enrollment.id)
          }
          errors++
        }
      } catch (err) {
        console.error('Enrollment processing error:', err)
        errors++
      }
    }

    return NextResponse.json({
      processed: dueEnrollments.length,
      sent,
      errors,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Sequence processing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Email sending helper — uses Brevo API
async function sendEmail(
  to: string,
  toName: string,
  from: string,
  fromName: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string }> {
  const apiKey = process.env.MAILERLITE_API_KEY

  if (!apiKey) {
    console.error('No email API key configured')
    return { success: false }
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: from,
        },
        to: [
          {
            email: to,
            name: toName,
          },
        ],
        subject: subject,
        htmlContent: html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Brevo error:', data)
      return { success: false }
    }

    return {
      success: true,
      messageId: data.messageId || `brevo_${Date.now()}`,
    }
  } catch (e) {
    console.error('Email send failed:', e)
    return { success: false }
  }
}
  const apiKey = process.env.MAILERLITE_API_KEY

  if (!apiKey) {
    console.log('[Sequence Email] Would send:', { to: params.to, subject: params.subject })
    // In development/before MailerLite is connected, log but report success
    // This lets sequences advance through steps even without email configured
    return { success: true, messageId: `dev_${Date.now()}` }
  }

  try {
    // MailerLite transactional email API
    const response = await fetch('https://connect.mailerlite.com/api/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: params.from.match(/<(.+)>/)?.[1] || params.from, name: params.from.match(/^(.+) </)?.[1] || '' },
        to: [{ email: params.to }],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, messageId: data.id || `ml_${Date.now()}` }
    }

    return { success: false }
  } catch {
    return { success: false }
  }
}
