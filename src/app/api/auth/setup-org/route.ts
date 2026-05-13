// src/app/api/auth/setup-org/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseAdmin = getAdminClient()
  try {
    const { auth_id, full_name, email, date_of_birth, org_name, industry } = await request.json()
    if (!auth_id || !full_name || !email || !org_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const slug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6)

    const { data: org, error: orgError } = await (supabaseAdmin
      .from('organizations')
      .insert([
        {
          name: org_name,
          slug,
          industry,
          plan_tier: 'beta',
          subscription_status: 'beta',
        },
      ])
      .select()
      .single() as any)
    
      const { error: userError } = await supabaseAdmin
  .from('users')
  .insert([
    {
      org_id: org.id,
      auth_id,
      email,
      full_name,
      date_of_birth,
      role: 'admin',
    },
  ] as any)
  
    const { error: setupError } = await supabaseAdmin.rpc('setup_new_organization', { p_org_id: org.id, p_plan_tier: 'beta' })
    if (setupError) throw setupError

    return NextResponse.json({ success: true, org_id: org.id })
  } catch (error: any) {
    console.error('Org setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
