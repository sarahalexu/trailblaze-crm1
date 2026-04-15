// src/app/api/plan/check/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanSummary, getSequenceLimits, checkSequenceCreation, checkEnrollment, checkAccountCreation } from '@/lib/plan-enforcement'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: org } = await supabase.from('organizations').select('plan_tier').eq('id', profile.org_id).single()
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const { action } = await request.json()
  const planTier = org.plan_tier as any

  switch (action) {
    case 'create_sequence': {
      const { count } = await supabase.from('sequences').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
      return NextResponse.json(checkSequenceCreation(planTier, count || 0))
    }
    case 'enroll_contacts': {
      const { count } = await supabase.from('sequence_enrollments').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id).eq('status', 'active')
      return NextResponse.json(checkEnrollment(planTier, count || 0, 1))
    }
    case 'create_account': {
      const { count } = await supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
      return NextResponse.json(checkAccountCreation(planTier, count || 0))
    }
    case 'get_summary': {
      return NextResponse.json({ summary: getPlanSummary(planTier), limits: getSequenceLimits(planTier) })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
