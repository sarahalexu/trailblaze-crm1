// src/app/api/codes/redeem/route.ts
// Redeems an access code and upgrades the org's plan

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const { code } = await request.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Please enter an access code.' }, { status: 400 })
  }

  const cleanCode = code.trim().toUpperCase()

  // Get user profile
  const { data: profile } = await supabase
    .from('users').select('id, org_id').eq('auth_id', user.id).single()
  if (!profile?.org_id) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  // Find the access code
  const { data: accessCode } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', cleanCode)
    .eq('is_active', true)
    .single()

  if (!accessCode) {
    return NextResponse.json({ error: 'Invalid access code. Check the code and try again.' }, { status: 404 })
  }

  // Check if code has expired
  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This access code has expired.' }, { status: 410 })
  }

  // Check if code hasn't started yet
  if (accessCode.starts_at && new Date(accessCode.starts_at) > new Date()) {
    return NextResponse.json({ error: 'This access code is not active yet.' }, { status: 400 })
  }

  // Check usage limits
  if (accessCode.times_used >= accessCode.max_uses) {
    return NextResponse.json({ error: 'This access code has reached its usage limit.' }, { status: 410 })
  }

  // Check if this org already redeemed this code
  const { data: existing } = await supabase
    .from('code_redemptions')
    .select('id')
    .eq('code_id', accessCode.id)
    .eq('org_id', profile.org_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Your organization has already used this code.' }, { status: 409 })
  }

  // Calculate access expiry
  const now = new Date()
  const accessExpiresAt = new Date(now.getTime() + accessCode.duration_days * 24 * 60 * 60 * 1000)

  // Get current plan before upgrade (to revert later)
  const { data: org } = await supabase
    .from('organizations')
    .select('plan_tier')
    .eq('id', profile.org_id)
    .single()

  // Create redemption record
  await supabase.from('code_redemptions').insert({
    code_id: accessCode.id,
    org_id: profile.org_id,
    redeemed_by_user_id: profile.id,
    plan_granted: accessCode.plan_tier,
    access_expires_at: accessExpiresAt.toISOString(),
  })

  // Increment usage count
  await supabase.from('access_codes').update({
    times_used: accessCode.times_used + 1,
  }).eq('id', accessCode.id)

  // Upgrade the organization's plan
  await supabase.from('organizations').update({
    plan_tier: accessCode.plan_tier,
    access_code_id: accessCode.id,
    access_expires_at: accessExpiresAt.toISOString(),
    previous_plan_tier: org?.plan_tier || 'starter',
  }).eq('id', profile.org_id)

  // Format expiry date for display
  const expiryDisplay = accessExpiresAt.toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return NextResponse.json({
    success: true,
    plan: accessCode.plan_tier,
    expires: expiryDisplay,
    duration_days: accessCode.duration_days,
    message: `Access code applied! You now have ${accessCode.plan_tier === 'beta' ? 'full' : accessCode.plan_tier} access until ${expiryDisplay}.`,
  })
}
