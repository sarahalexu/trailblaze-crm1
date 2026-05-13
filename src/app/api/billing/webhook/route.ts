// src/app/api/billing/webhook/route.ts
// Paystack sends events here when payments succeed, fail, or subscriptions change
// Set this URL in Paystack: Settings → API Keys & Webhooks → Webhook URL
// URL: https://crm.trailblazeafrica.com/api/billing/webhook

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || ''

// Verify Paystack webhook signature
function verifySignature(body: string, signature: string): boolean {
  if (!PAYSTACK_SECRET) return false

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex')

  return hash === signature
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature') || ''

  // Verify webhook is from Paystack
  if (PAYSTACK_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    )
  }

  const event = JSON.parse(body)
  const supabaseAdmin = getAdminClient()

  switch (event.event) {
    // One-time payment or first subscription payment
    case 'charge.success': {
      const data = event.data
      const metadata = data.metadata || {}

      const orgId = metadata.org_id
      const planTier = metadata.plan_tier

      if (!orgId || !planTier) break

      // Get current org
      const { data: org } = await (supabaseAdmin
        .from('organizations') as any)
        .select('plan_tier')
        .eq('id', orgId)
        .single()

      // Upgrade the plan
      await (supabaseAdmin.from('organizations') as any)
        .update({
          plan_tier: planTier,
          subscription_status: 'active',
          previous_plan_tier: org?.plan_tier || 'starter',
          paystack_customer_code:
            data.customer?.customer_code || null,
          paystack_subscription_code:
            data.subscription?.subscription_code || null,
          last_payment_at: new Date().toISOString(),
          last_payment_amount: data.amount / 100,
          access_expires_at: null,
          access_code_id: null,
        })
        .eq('id', orgId)

      // Create invoice record
      await (supabaseAdmin.from('invoices') as any).insert([
        {
          org_id: orgId,
          invoice_number: `TB-${Date.now()
            .toString(36)
            .toUpperCase()}`,
          amount: data.amount / 100,
          currency: data.currency || 'NGN',
          plan_tier: planTier,
          billing_cycle: metadata.billing_cycle || 'monthly',
          user_count: metadata.user_count || 1,
          paystack_reference: data.reference,
          paid_at: new Date(
            data.paid_at || Date.now()
          ).toISOString(),
          status: 'paid',
          customer_email: data.customer?.email,
        },
      ])

      // Notify org admin
      const { data: admins } = await (supabaseAdmin
        .from('users') as any)
        .select('id')
        .eq('org_id', orgId)
        .eq('role', 'admin')
        .limit(1)

      if (admins?.[0]) {
        await (supabaseAdmin.from('notifications') as any).insert([
          {
            user_id: admins[0].id,
            org_id: orgId,
            type: 'system',
            title: `Plan upgraded to ${planTier}`,
            message: `Payment of ₦${(
              data.amount / 100
            ).toLocaleString()} received. Your ${planTier} plan is now active.`,
          },
        ])
      }

      break
    }

    // Subscription renewed successfully
    case 'subscription.charge.success': {
      const data = event.data
      const subCode = data.subscription?.subscription_code

      if (subCode) {
        // Find org by subscription code
        const { data: org } = await (supabaseAdmin
          .from('organizations') as any)
          .select('id, plan_tier')
          .eq('paystack_subscription_code', subCode)
          .single()

        if (org) {
          await (supabaseAdmin.from('organizations') as any)
            .update({
              subscription_status: 'active',
              last_payment_at: new Date().toISOString(),
              last_payment_amount: data.amount / 100,
            })
            .eq('id', org.id)

          // Create invoice
          await (supabaseAdmin.from('invoices') as any).insert([
            {
              org_id: org.id,
              invoice_number: `TB-${Date.now()
                .toString(36)
                .toUpperCase()}`,
              amount: data.amount / 100,
              currency: 'NGN',
              plan_tier: org.plan_tier,
              billing_cycle: 'monthly',
              paystack_reference: data.reference,
              paid_at: new Date().toISOString(),
              status: 'paid',
            },
          ])
        }
      }

      break
    }

    // Subscription payment failed
    case 'subscription.charge.failed': {
      const subCode = event.data.subscription?.subscription_code

      if (subCode) {
        const { data: org } = await (supabaseAdmin
          .from('organizations') as any)
          .select('id, plan_tier')
          .eq('paystack_subscription_code', subCode)
          .single()

        if (org) {
          await (supabaseAdmin.from('organizations') as any)
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', org.id)

          const { data: admins } = await (supabaseAdmin
            .from('users') as any)
            .select('id')
            .eq('org_id', org.id)
            .eq('role', 'admin')
            .limit(1)

          if (admins?.[0]) {
            await (supabaseAdmin
              .from('notifications') as any)
              .insert([
                {
                  user_id: admins[0].id,
                  org_id: org.id,
                  type: 'system',
                  title: 'Payment failed',
                  message:
                    'Your subscription payment failed. Please update your payment method in Settings → Billing to avoid losing access.',
                },
              ])
          }
        }
      }

      break
    }

    // Subscription cancelled
    case 'subscription.disable': {
      const subCode = event.data.subscription_code

      if (subCode) {
        const { data: org } = await (supabaseAdmin
          .from('organizations') as any)
          .select('id, plan_tier, previous_plan_tier')
          .eq('paystack_subscription_code', subCode)
          .single()

        if (org) {
          // Downgrade to starter
          await (supabaseAdmin.from('organizations') as any)
            .update({
              plan_tier: 'starter',
              subscription_status: 'cancelled',
              paystack_subscription_code: null,
              previous_plan_tier: org.plan_tier,
            })
            .eq('id', org.id)

          const { data: admins } = await (supabaseAdmin
            .from('users') as any)
            .select('id')
            .eq('org_id', org.id)
            .eq('role', 'admin')
            .limit(1)

          if (admins?.[0]) {
            await (supabaseAdmin
              .from('notifications') as any)
              .insert([
                {
                  user_id: admins[0].id,
                  org_id: org.id,
                  type: 'system',
                  title: 'Subscription cancelled',
                  message:
                    'Your subscription has been cancelled and your plan has been downgraded to Free. Your data is safe. Re-subscribe anytime from Settings → Billing.',
                },
              ])
          }
        }
      }

      break
    }
  }

  return NextResponse.json({ received: true })
}