// src/app/api/auth/setup-org/route.ts
// FIXED: Creates pipelines directly as fallback if RPC function fails.
// Default plan is 'starter'. No more silent pipeline failures.

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function createDefaultPipelines(supabaseAdmin: any, orgId: string) {
  try {
    // Retention pipeline
    const { data: retPipeline } = await supabaseAdmin.from('pipelines')
      .insert({ org_id: orgId, name: 'Account retention', description: 'Track accounts from onboarding to renewal', pipeline_type: 'retention', is_default: true, sort_order: 1 })
      .select('id').single()

    if (retPipeline) {
      await supabaseAdmin.from('pipeline_stages').insert([
        { pipeline_id: retPipeline.id, org_id: orgId, name: 'Onboarding', description: 'New client, setup in progress', sort_order: 1, color: '#85B7EB', is_default: true },
        { pipeline_id: retPipeline.id, org_id: orgId, name: 'Active', description: 'Healthy, engaged relationship', sort_order: 2, color: '#97C459', is_default: true },
        { pipeline_id: retPipeline.id, org_id: orgId, name: 'Growth', description: 'Upsell or expansion opportunity', sort_order: 3, color: '#AFA9EC', is_default: true },
        { pipeline_id: retPipeline.id, org_id: orgId, name: 'At risk', description: 'Health score declining', sort_order: 4, color: '#F0997B', is_default: true },
        { pipeline_id: retPipeline.id, org_id: orgId, name: 'Renewal', description: 'Renewal window approaching', sort_order: 5, color: '#FAC775', is_default: true },
        { pipeline_id: retPipeline.id, org_id: orgId, name: 'Churned', description: 'Client lost', sort_order: 6, color: '#F09595', is_default: true },
      ])
    }

    // Sales pipeline
    const { data: salesPipeline } = await supabaseAdmin.from('pipelines')
      .insert({ org_id: orgId, name: 'Sales pipeline', description: 'Track deals from lead to close', pipeline_type: 'sales', is_default: true, sort_order: 2 })
      .select('id').single()

    if (salesPipeline) {
      await supabaseAdmin.from('pipeline_stages').insert([
        { pipeline_id: salesPipeline.id, org_id: orgId, name: 'Lead', description: 'New prospect identified', sort_order: 1, color: '#7e7e7e', is_default: true },
        { pipeline_id: salesPipeline.id, org_id: orgId, name: 'Qualified', description: 'Prospect meets ICP criteria', sort_order: 2, color: '#85B7EB', is_default: true },
        { pipeline_id: salesPipeline.id, org_id: orgId, name: 'Proposal', description: 'Proposal or quote sent', sort_order: 3, color: '#AFA9EC', is_default: true },
        { pipeline_id: salesPipeline.id, org_id: orgId, name: 'Negotiation', description: 'Terms being discussed', sort_order: 4, color: '#FAC775', is_default: true },
        { pipeline_id: salesPipeline.id, org_id: orgId, name: 'Won', description: 'Deal closed successfully', sort_order: 5, color: '#97C459', is_default: true },
        { pipeline_id: salesPipeline.id, org_id: orgId, name: 'Lost', description: 'Deal did not close', sort_order: 6, color: '#F09595', is_default: true },
      ])
    }

    // WhatsApp config (optional, don't fail if table missing)
    try {
      await supabaseAdmin.from('whatsapp_config').insert({ org_id: orgId, monthly_message_limit: 0 })
    } catch { }

    return true
  } catch (err) {
    console.error('Fallback pipeline creation error:', err)
    return false
  }
}

export async function POST(request: Request) {
  const supabaseAdmin = getAdminClient()

  try {
    const { auth_id, full_name, email, date_of_birth, org_name, industry } = await request.json()

    if (!auth_id || !full_name || !email || !org_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.trailblazeafrica.com'

    // Check if user already exists
    const { data: existingUser } = await (supabaseAdmin.from('users') as any)
      .select('id, org_id').eq('auth_id', auth_id).maybeSingle()

    if (existingUser) {
      // Check if they have pipelines, create if missing
      const { data: hasPipeline } = await supabaseAdmin.from('pipelines')
        .select('id').eq('org_id', existingUser.org_id).limit(1).maybeSingle()
      if (!hasPipeline) {
        await createDefaultPipelines(supabaseAdmin, existingUser.org_id)
      }
      return NextResponse.json({ success: true, org_id: existingUser.org_id, existing: true })
    }

    const slug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6)

    // Create organization on starter plan
    const { data: org, error: orgError } = await (supabaseAdmin.from('organizations') as any)
      .insert([{ name: org_name, slug, industry, plan_tier: 'starter', subscription_status: 'active' }])
      .select().single()

    if (orgError) throw orgError

    // Create user
    const { data: newUser, error: userError } = await (supabaseAdmin.from('users') as any)
      .insert([{ org_id: org.id, auth_id, email, full_name, date_of_birth, role: 'admin' }])
      .select().single()

    if (userError) throw userError

    // Try the RPC function first
    const { error: setupError } = await (supabaseAdmin as any).rpc('setup_new_organization', {
      p_org_id: org.id, p_plan_tier: 'starter',
    })

    // If RPC failed, create pipelines directly as fallback
    if (setupError) {
      console.error('RPC failed, using fallback:', setupError.message)
      await createDefaultPipelines(supabaseAdmin, org.id)
    }

    // Verify pipelines were created
    const { data: verifyPipeline } = await supabaseAdmin.from('pipelines')
      .select('id').eq('org_id', org.id).limit(1).maybeSingle()

    if (!verifyPipeline) {
      // Last resort: try fallback one more time
      await createDefaultPipelines(supabaseAdmin, org.id)
    }

    // Notifications (non-blocking)
    fetch(`${appUrl}/api/notifications/new-signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: newUser.id, orgId: org.id }),
    }).catch(() => {})

    fetch(`${appUrl}/api/billing/lifecycle-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'welcome', userId: newUser.id, orgId: org.id }),
    }).catch(() => {})

    return NextResponse.json({ success: true, org_id: org.id })
  } catch (error: any) {
    console.error('Org setup error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 })
  }
}
