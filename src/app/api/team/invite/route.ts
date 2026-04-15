// src/app/api/team/invite/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('id, org_id, role, full_name').eq('auth_id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 })
  }

  const { email, role, org_id } = await request.json()
  const supabaseAdmin = getAdminClient()

  const { data: org } = await supabase.from('organizations').select('max_users').eq('id', org_id).single()
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('org_id', org_id).eq('is_active', true)
  if (org && count && count >= org.max_users) {
    return NextResponse.json({ error: 'Team size limit reached. Upgrade your plan.' }, { status: 403 })
  }

  const { data: existing } = await supabase.from('users').select('id').eq('org_id', org_id).eq('email', email).single()
  if (existing) {
    return NextResponse.json({ error: 'User already exists in this organization' }, { status: 400 })
  }

  try {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { org_id, role, invited_by: profile.full_name },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    })
    if (inviteError) throw inviteError

    await supabaseAdmin.from('users').insert({
      org_id, auth_id: inviteData.user.id, email, full_name: email.split('@')[0], role: role || 'account_manager', is_active: true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
