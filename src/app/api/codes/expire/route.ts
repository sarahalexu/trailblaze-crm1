// src/app/api/codes/expire/route.ts
// Cron endpoint — checks for expired access codes and downgrades plans
// Add to cron-job.org: run every 6 hours
// URL: /api/codes/expire?secret=YOUR_CRON_SECRET

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET || 'tb-cron-2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabaseAdmin = getAdminClient()
  const now = new Date().toISOString()

  let downgraded = 0

  // Find all organizations with expired access
  const { data } = await (supabaseAdmin
    .from('organizations')
    .select(
      'id, name, plan_tier, previous_plan_tier, access_code_id, access_expires_at'
    )
    .not('access_expires_at', 'is', null)
    .lte('access_expires_at', now)
    .neq('plan_tier', 'starter') as any)

  const expiredOrgs = data || []

  if (expiredOrgs.length === 0) {
    return NextResponse.json({
      checked: true,
      downgraded: 0,
      message: 'No expired access found',
    })
  }

  for (const org of expiredOrgs) {
    // Downgrade logic
    const revertTo =
      org.previous_plan_tier === 'growth' ||
      org.previous_plan_tier === 'scale'
        ? org.previous_plan_tier
        : 'starter'

    // Update organization
    await ((supabaseAdmin
      .from('organizations') as any)
      .update({
        plan_tier: revertTo,
        access_code_id: null,
        access_expires_at: null,
        previous_plan_tier: null,
      })
      .eq('id', org.id))

    // Mark redemption as expired
    if (org.access_code_id) {
      await ((supabaseAdmin
        .from('code_redemptions') as any)
        .update({
          is_expired: true,
          reverted_at: now,
        })
        .eq('org_id', org.id)
        .eq('code_id', org.access_code_id))
    }

    // Find admin user
    const { data: adminUsers } = await (supabaseAdmin
      .from('users')
      .select('id')
      .eq('org_id', org.id)
      .eq('role', 'admin')
      .limit(1) as any)

    // Notify admin
    if (adminUsers && adminUsers.length > 0) {
      await ((supabaseAdmin
        .from('notifications') as any)
        .insert([
          {
            user_id: adminUsers[0].id,
            org_id: org.id,
            type: 'system',
            title: 'Your access plan has changed',
            message: `Your ${org.plan_tier} access has expired. You've been moved to the ${revertTo} plan. Upgrade anytime from Settings → Billing to restore full access.`,
          },
        ]))
    }

    downgraded++
  }

  return NextResponse.json({
    checked: true,
    downgraded,
    timestamp: now,
    details: expiredOrgs.map((o: any) => ({
      org: o.name,
      from: o.plan_tier,
      expired_at: o.access_expires_at,
    })),
  })
}