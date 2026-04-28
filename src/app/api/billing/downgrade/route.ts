// src/app/api/billing/downgrade/route.ts
// Handles plan downgrade requests

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('id, org_id, role').eq('auth_id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change plans' }, { status: 403 })
  }

  const { to_plan, reason } = await request.json()
  const toPlan = to_plan || 'starter'

  const { data: org } = await supabase.from('organizations').select('plan_tier, subscription_status, paystack_subscription_code').eq('id', profile.org_id).single()
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  if (org.plan_tier === 'starter') {
    return NextResponse.json({ error: "You're already on the Free plan" }, { status: 400 })
  }

  // If they have a Paystack subscription, cancel it
  if (org.paystack_subscription_code && process.env.PAYSTACK_SECRET_KEY) {
    try {
      await fetch(`https://api.paystack.co/subscription/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: org.paystack_subscription_code,
          token: org.paystack_customer_code, // email token
        }),
      })
    } catch (e) {
      console.error('Failed to cancel Paystack subscription:', e)
    }
  }

  // Schedule downgrade (effective immediately for now)
  // In future: effective at end of billing cycle
  await supabase.from('organizations').update({
    plan_tier: toPlan,
    subscription_status: 'cancelled',
    previous_plan_tier: org.plan_tier,
    paystack_subscription_code: null,
  }).eq('id', profile.org_id)

  // Log the downgrade request
  await supabase.from('downgrade_requests').insert({
    org_id: profile.org_id,
    requested_by_user_id: profile.id,
    from_plan: org.plan_tier,
    to_plan: toPlan,
    reason: reason || null,
    effective_at: new Date().toISOString(),
    status: 'processed',
  })

  // Create notification
  await supabase.from('notifications').insert({
    user_id: profile.id,
    org_id: profile.org_id,
    type: 'system',
    title: 'Plan downgraded',
    message: `Your plan has been changed from ${org.plan_tier} to ${toPlan}. Your data is safe. You can upgrade again anytime.`,
  })

  return NextResponse.json({
    success: true,
    message: `Plan changed to ${toPlan}. Your data is preserved.`,
  })
}
