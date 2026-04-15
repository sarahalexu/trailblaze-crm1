// src/app/api/data/export/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'csv'

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('org_id').eq('auth_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const orgId = profile.org_id

  // Fetch all exportable data
  const [accounts, contacts, interactions, deals] = await Promise.all([
    supabase.from('accounts').select('*').eq('org_id', orgId),
    supabase.from('contacts').select('*').eq('org_id', orgId),
    supabase.from('interactions').select('*').eq('org_id', orgId),
    supabase.from('deals').select('*').eq('org_id', orgId),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    accounts: accounts.data || [],
    contacts: contacts.data || [],
    interactions: interactions.data || [],
    deals: deals.data || [],
  }

  if (format === 'json') {
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="trailblaze-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  }

  // CSV format — export accounts as primary
  const csvRows = ['Name,Industry,Health Score,Status,Contract Value,Renewal Date,Last Contact']
  for (const a of exportData.accounts) {
    csvRows.push([
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${a.industry || ''}"`,
      a.health_score_total || 0,
      a.health_status || '',
      a.contract_value_annual || 0,
      a.renewal_date || '',
      a.last_interaction_at || '',
    ].join(','))
  }

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="trailblaze-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
