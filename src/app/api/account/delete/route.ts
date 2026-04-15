// src/app/api/account/delete/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('id, org_id, role').eq('auth_id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete organizations' }, { status: 403 })
  }

  const supabaseAdmin = getAdminClient()
  const orgId = profile.org_id

  try {
    await supabaseAdmin.from('playbook_step_progress').delete().in('assignment_id', (await supabaseAdmin.from('playbook_assignments').select('id').eq('org_id', orgId)).data?.map(t => t.id) || [])
    await supabaseAdmin.from('playbook_assignments').delete().eq('org_id', orgId)
    await supabaseAdmin.from('ticket_messages').delete().in('ticket_id', (await supabaseAdmin.from('support_tickets').select('id').eq('org_id', orgId)).data?.map(t => t.id) || [])
    await supabaseAdmin.from('support_tickets').delete().eq('org_id', orgId)
    await supabaseAdmin.from('whatsapp_messages').delete().eq('org_id', orgId)
    await supabaseAdmin.from('whatsapp_config').delete().eq('org_id', orgId)
    await supabaseAdmin.from('audit_log').delete().eq('org_id', orgId)
    await supabaseAdmin.from('notifications').delete().eq('org_id', orgId)
    await supabaseAdmin.from('health_score_history').delete().eq('org_id', orgId)
    await supabaseAdmin.from('interactions').delete().eq('org_id', orgId)
    await supabaseAdmin.from('deals').delete().eq('org_id', orgId)
    await supabaseAdmin.from('contacts').delete().eq('org_id', orgId)
    await supabaseAdmin.from('accounts').delete().eq('org_id', orgId)
    await supabaseAdmin.from('pipeline_stages').delete().eq('org_id', orgId)
    await supabaseAdmin.from('pipelines').delete().eq('org_id', orgId)
    await supabaseAdmin.from('users').delete().eq('org_id', orgId)
    await supabaseAdmin.from('organizations').delete().eq('id', orgId)
    await supabaseAdmin.auth.admin.deleteUser(user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
