// src/app/api/billing/webhook/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/paystack'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature') || ''
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabaseAdmin = getAdminClient()
  const event = JSON.parse(body)

  try {
    switch (event.event) {
      case 'charge.success': {
        const data = event.data
        const orgId = data.metadata?.org_id
        const planTier = data.metadata?.plan_tier
        if (orgId && planTier) {
          const planLimits: Record<string, { max_users: number; max_accounts: number }> = {
            growth: { max_users: 10, max_accounts: 500 },
            scale: { max_users: 50, max_accounts: 99999 },
            enterprise: { max_users: 99999, max_accounts: 99999 },
          }
          const limits = planLimits[planTier] || planLimits.growth
          await supabaseAdmin.from('organizations').update({
            plan_tier: planTier, subscription_status: 'active', max_users: limits.max_users, max_accounts: limits.max_accounts,
          }).eq('id', orgId)

          const waLimits: Record<string, number> = { growth: 1000, scale: 99999, enterprise: 99999 }
          await supabaseAdmin.from('whatsapp_config').update({ monthly_message_limit: waLimits[planTier] || 0 }).eq('org_id', orgId)

          const { data: admin } = await supabaseAdmin.from('users').select('id').eq('org_id', orgId).eq('role', 'admin').limit(1).single()
          if (admin) {
            await supabaseAdmin.from('notifications').insert({
              org_id: orgId, user_id: admin.id, type: 'system',
              title: `Plan upgraded to ${planTier}`,
              message: `Your workspace has been upgraded to the ${planTier} plan.`,
              delivery_channel: 'in_app',
            })
          }
        }
        break
      }
      case 'subscription.disable':
      case 'subscription.not_renew': {
        const customerEmail = event.data?.customer?.email
        if (customerEmail) {
          const { data: user } = await supabaseAdmin.from('users').select('org_id').eq('email', customerEmail).eq('role', 'admin').limit(1).single()
          if (user) {
            await supabaseAdmin.from('organizations').update({ plan_tier: 'starter', subscription_status: 'cancelled', max_users: 1, max_accounts: 15 }).eq('id', user.org_id)
            await supabaseAdmin.from('whatsapp_config').update({ monthly_message_limit: 0 }).eq('org_id', user.org_id)
          }
        }
        break
      }
      case 'invoice.payment_failed': {
        const customerEmail = event.data?.customer?.email
        if (customerEmail) {
          const { data: user } = await supabaseAdmin.from('users').select('id, org_id').eq('email', customerEmail).eq('role', 'admin').limit(1).single()
          if (user) {
            await supabaseAdmin.from('organizations').update({ subscription_status: 'past_due' }).eq('id', user.org_id)
            await supabaseAdmin.from('notifications').insert({
              org_id: user.org_id, user_id: user.id, type: 'system', title: 'Payment failed',
              message: 'Your subscription payment failed. Please update your payment method.', delivery_channel: 'in_app',
            })
          }
        }
        break
      }
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ received: true })
  }
}
