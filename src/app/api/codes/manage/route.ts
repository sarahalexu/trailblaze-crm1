// src/app/api/codes/manage/route.ts
// Admin-only: create, list, deactivate access codes

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// List all codes
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Super admin check
  const { data: profile } = await supabase.from('users').select('email').eq('auth_id', user.id).single()
  if (profile?.email !== 'sarah@trailblazeafrica.com') {
    return NextResponse.json({ error: 'Admin access only' }, { status: 403 })
  }

  const { data: codes } = await supabase
    .from('access_codes')
    .select('*, redemptions:code_redemptions(id, org_id, redeemed_at, access_expires_at, is_expired, org:organizations(name))')
    .order('created_at', { ascending: false })

  return NextResponse.json({ codes: codes || [] })
}

// Create new code
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('email').eq('auth_id', user.id).single()
  if (profile?.email !== 'sarah@trailblazeafrica.com') {
    return NextResponse.json({ error: 'Admin access only' }, { status: 403 })
  }

  const { code, plan_tier, description, max_uses, duration_days, expires_at } = await request.json()

  if (!code || !plan_tier) {
    return NextResponse.json({ error: 'Code and plan tier are required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('access_codes').insert({
    code: code.trim().toUpperCase(),
    plan_tier,
    description: description || null,
    max_uses: max_uses || 1,
    duration_days: duration_days || 60,
    expires_at: expires_at || null,
  }).select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A code with that name already exists.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, code: data })
}

// Deactivate a code
export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('email').eq('auth_id', user.id).single()
  if (profile?.email !== 'sarah@trailblazeafrica.com') {
    return NextResponse.json({ error: 'Admin access only' }, { status: 403 })
  }

  const { code_id, is_active } = await request.json()
  await supabase.from('access_codes').update({ is_active }).eq('id', code_id)

  return NextResponse.json({ success: true })
}
