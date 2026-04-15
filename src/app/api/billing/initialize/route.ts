// src/app/api/billing/initialize/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { initializePayment, PLAN_PRICING } from '@/lib/paystack'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import crypto from 'crypto'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('id, org_id, email, role').eq('auth_id', user.id).single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 })
  }

  const { planTier, billingCycle } = await request.json()

  if (!['growth', 'scale'].includes(planTier) || !['monthly', 'annual'].includes(billingCycle)) {
    return NextResponse.json({ error: 'Invalid plan or billing cycle' }, { status: 400 })
  }

  const pricing = PLAN_PRICING[planTier as keyof typeof PLAN_PRICING]
  const amount = billingCycle === 'monthly' ? pricing.monthly : pricing.annual
  const reference = `tb_${planTier}_${crypto.randomUUID().slice(0, 8)}`

  const result = await initializePayment({
    email: profile.email,
    amount,
    reference,
    metadata: {
      org_id: profile.org_id,
      plan_tier: planTier,
      billing_cycle: billingCycle,
      user_id: profile.id,
    },
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing/callback`,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    authorization_url: result.data.authorization_url,
    reference: result.data.reference,
  })
}
