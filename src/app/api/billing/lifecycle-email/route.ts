// src/app/api/billing/lifecycle-email/route.ts
// Sends subscription lifecycle emails: welcome, upgrade, downgrade, cancellation
// Called after successful plan change in billing flow

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BREVO_API_KEY = process.env.MAILERLITE_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EmailTemplate {
  subject: string
  html: string
}

function getTemplate(event: string, data: { userName: string; planName: string; orgName: string }): EmailTemplate {
  const { userName, planName, orgName } = data
  const firstName = userName.split(' ')[0]

  const templates: Record<string, EmailTemplate> = {
    welcome: {
      subject: `Welcome to TrailBlaze CRM, ${firstName}!`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="color: #2b0548; font-size: 24px; margin-bottom: 16px;">Welcome to TrailBlaze CRM</h1>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Your account for <strong>${orgName}</strong> is ready. Here are a few things to do first:</p>
          <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>1.</strong> Add your first account (a company you manage)</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>2.</strong> Connect Gmail to sync your email conversations</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>3.</strong> Score your first account using the KEEP Framework</p>
            <p style="color: #374151; font-size: 14px; margin: 0;"><strong>4.</strong> Activate a playbook to guide your workflow</p>
          </div>
          <a href="${APP_URL}/dashboard" style="display: inline-block; background: #2b0548; color: #e1b3ee; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Go to your dashboard</a>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">Need help getting started? Reply to this email or check our help centre.</p>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">TrailBlaze Africa</p>
        </div>
      `,
    },

    upgraded: {
      subject: `You're now on the ${planName} plan!`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="color: #2b0548; font-size: 24px; margin-bottom: 16px;">Plan upgraded to ${planName}</h1>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Great move. Your <strong>${orgName}</strong> account is now on the <strong>${planName}</strong> plan. Here is what you have unlocked:</p>
          ${planName === 'Growth' ? `
          <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; AI risk analysis and draft messages</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; Email open tracking</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; WhatsApp sequences</p>
            <p style="color: #374151; font-size: 14px; margin: 0;">&#10003; Up to 500 accounts</p>
          </div>` : planName === 'Scale' ? `
          <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; Everything in Growth</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; Custom playbooks and pipelines</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; WhatsApp broadcasts</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; Stakeholder mapping and client portal</p>
            <p style="color: #374151; font-size: 14px; margin: 0;">&#10003; REST API access</p>
          </div>` : `
          <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; Everything in Scale</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; SAML/OIDC single sign-on</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">&#10003; White-label branding</p>
            <p style="color: #374151; font-size: 14px; margin: 0;">&#10003; Dedicated support</p>
          </div>`}
          <a href="${APP_URL}/dashboard" style="display: inline-block; background: #2b0548; color: #e1b3ee; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Explore your new features</a>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">TrailBlaze Africa</p>
        </div>
      `,
    },

    downgraded: {
      subject: `Your plan has been changed to ${planName}`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="color: #2b0548; font-size: 24px; margin-bottom: 16px;">Plan changed to ${planName}</h1>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Your <strong>${orgName}</strong> account has been moved to the <strong>${planName}</strong> plan. Your existing data is safe and you can still access everything you have created.</p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Some features from your previous plan may no longer be available. If this was a mistake or you would like to upgrade again, you can do so anytime from your settings.</p>
          <a href="${APP_URL}/settings/billing" style="display: inline-block; background: #2b0548; color: #e1b3ee; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">View plans</a>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">We would love to know why you changed plans. Just reply to this email with your feedback.</p>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">TrailBlaze Africa</p>
        </div>
      `,
    },

    cancelled: {
      subject: `We're sad to see you go, ${firstName}`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="color: #2b0548; font-size: 24px; margin-bottom: 16px;">Your subscription has been cancelled</h1>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Your <strong>${orgName}</strong> subscription has been cancelled. Your data will remain accessible for 30 days.</p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">If you change your mind, you can resubscribe anytime and pick up right where you left off.</p>
          <a href="${APP_URL}/settings/billing" style="display: inline-block; background: #2b0548; color: #e1b3ee; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Resubscribe</a>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">We would really appreciate knowing what we could have done better. Reply to this email anytime.</p>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">TrailBlaze Africa</p>
        </div>
      `,
    },
  }

  return templates[event] || templates.welcome
}

export async function POST(req: NextRequest) {
  try {
    const { event, userId, orgId } = await req.json()

    if (!event || !userId) {
      return NextResponse.json({ error: 'event and userId are required' }, { status: 400 })
    }

    // Get user and org details
    const { data: user } = await supabaseAdmin.from('users').select('full_name, email').eq('id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: org } = await supabaseAdmin.from('organizations').select('name, plan_tier').eq('id', orgId).single()
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    const planName = (org.plan_tier || 'Starter').charAt(0).toUpperCase() + (org.plan_tier || 'starter').slice(1)
    const template = getTemplate(event, { userName: user.full_name, planName, orgName: org.name })

    if (!BREVO_API_KEY) {
      console.error('MAILERLITE_API_KEY (Brevo) not configured')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    // Send via Brevo
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'TrailBlaze CRM', email: 'support@trailblazeafrica.com' },
        to: [{ email: user.email, name: user.full_name }],
        subject: template.subject,
        htmlContent: template.html,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      console.error('Brevo error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, event, to: user.email })
  } catch (err: any) {
    console.error('Lifecycle email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
