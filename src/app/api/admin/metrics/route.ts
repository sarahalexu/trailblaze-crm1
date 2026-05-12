// src/app/api/admin/metrics/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SUPER_ADMIN_EMAILS } from '@/lib/super-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabaseAdmin = getAdminClient()
  const [orgsRes, usersRes, accountsRes, dealsRes, interactionsRes] = await Promise.all([
    supabaseAdmin.from('organizations').select('*'),
    supabaseAdmin.from('users').select('id, org_id, is_active', { count: 'exact' }).eq('is_active', true),
    supabaseAdmin.from('accounts').select('id, org_id', { count: 'exact' }),
    supabaseAdmin.from('deals').select('id', { count: 'exact' }),
    supabaseAdmin.from('interactions').select('id', { count: 'exact' }),
  ])

  const orgs = orgsRes.data || []
  const orgDetails = (orgs as any[]).map((org: any) => ({
    ...org,
    user_count: (usersRes.data || []).filter((u: any) => u.org_id === org.id).length,
    account_count: (accountsRes.data || []).filter((a: any) => a.org_id === org.id).length,
  }))

  const plans = ['beta', 'starter', 'growth', 'scale', 'enterprise'].map(tier => ({
    plan_tier: tier,
    count: orgs.filter(o => o.plan_tier === tier).length,
  }))

  return NextResponse.json({
    metrics: {
      total_orgs: orgs.length,
      total_users: usersRes.count || 0,
      total_accounts: accountsRes.count || 0,
      total_deals: dealsRes.count || 0,
      total_interactions: interactionsRes.count || 0,
      plans,
    },
    organizations: orgDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  })
}
