import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ACCOUNTS = [
  { name: 'Paystack Technologies', industry: 'Fintech', value: 4800000, k: 5, e: 4, ex: 5, p: 4, status: 'active', days: 2 },
  { name: 'Sterling Bank Digital', industry: 'Banking', value: 12000000, k: 4, e: 3, ex: 3, p: 2, status: 'active', days: 8 },
  { name: 'Flutterwave Inc', industry: 'Fintech', value: 7500000, k: 5, e: 5, ex: 4, p: 5, status: 'active', days: 1 },
  { name: 'Kuda Microfinance', industry: 'Banking', value: 3200000, k: 3, e: 2, ex: 2, p: 1, status: 'at_risk', days: 21 },
  { name: 'Andela Nigeria', industry: 'Technology', value: 5600000, k: 4, e: 4, ex: 4, p: 3, status: 'active', days: 5 },
  { name: 'Piggyvest Financial', industry: 'Fintech', value: 2800000, k: 2, e: 1, ex: 2, p: 1, status: 'at_risk', days: 35 },
  { name: 'Moniepoint MFB', industry: 'Fintech', value: 9200000, k: 5, e: 4, ex: 5, p: 4, status: 'active', days: 3 },
  { name: 'Korapay Solutions', industry: 'Fintech', value: 1500000, k: 1, e: 1, ex: 1, p: 0, status: 'at_risk', days: 60 },
]

const CONTACTS = [
  { ai: 0, name: 'Shola Akinlade', role: 'decision_maker', title: 'CEO' },
  { ai: 1, name: 'Funke Adeyemi', role: 'champion', title: 'VP Digital' },
  { ai: 2, name: 'Olugbenga Agboola', role: 'decision_maker', title: 'CEO' },
  { ai: 3, name: 'Babs Ogundeyi', role: 'decision_maker', title: 'CEO' },
  { ai: 4, name: 'Seni Sulyman', role: 'champion', title: 'MD Nigeria' },
  { ai: 5, name: 'Odunayo Eweniyi', role: 'decision_maker', title: 'COO' },
  { ai: 6, name: 'Tosin Eniolorunda', role: 'decision_maker', title: 'CEO' },
  { ai: 7, name: 'Gbenga Kolade', role: 'end_user', title: 'Product Lead' },
]

const INTERACTIONS = [
  { ai: 0, ch: 'call', dir: 'outbound', subj: 'Quarterly review call', content: 'Discussed Q1 performance. Client very happy.', days: 2 },
  { ai: 0, ch: 'whatsapp', dir: 'inbound', subj: 'Quick question on reporting', content: 'Asked about custom report availability.', days: 5 },
  { ai: 1, ch: 'email', dir: 'outbound', subj: 'Integration follow-up', content: 'Addressed API integration timeline questions.', days: 8 },
  { ai: 2, ch: 'meeting', dir: 'outbound', subj: 'QBR with leadership', content: 'Full quarterly review. Very positive. Upsell discussion.', days: 1 },
  { ai: 3, ch: 'call', dir: 'outbound', subj: 'Check-in call', content: 'Hard to reach. Left voicemail. Second attempt.', days: 14 },
  { ai: 3, ch: 'whatsapp', dir: 'outbound', subj: 'Follow-up nudge', content: 'Sent WhatsApp. No response yet.', days: 21 },
  { ai: 4, ch: 'email', dir: 'inbound', subj: 'Renewal discussion', content: 'They want to discuss renewal terms. 45 days left.', days: 5 },
  { ai: 5, ch: 'call', dir: 'outbound', subj: 'Re-engagement', content: 'Client frustrated with last quarter. Needs recovery plan.', days: 7 },
  { ai: 6, ch: 'whatsapp', dir: 'outbound', subj: 'Post-onboarding check', content: 'Onboarding complete. Client excited.', days: 3 },
  { ai: 6, ch: 'meeting', dir: 'outbound', subj: 'Training session', content: '90-minute training for their AM team.', days: 10 },
]

export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 })

  const { data: pipeline } = await supabase.from('pipelines').select('id').eq('org_id', profile.org_id).eq('pipeline_type', 'retention').eq('is_default', true).single()
  const { data: stages } = await supabase.from('pipeline_stages').select('*').eq('pipeline_id', pipeline?.id).order('sort_order')
  const findStage = (kw: string) => (stages || []).find(s => s.name.toLowerCase().includes(kw))?.id || stages?.[1]?.id

  const ids: string[] = []
  for (const a of ACCOUNTS) {
    const renew = new Date(); renew.setDate(renew.getDate() + 30 + Math.floor(Math.random() * 90))
    const last = new Date(); last.setDate(last.getDate() - a.days)
    const { data: acc } = await supabase.from('accounts').insert({
      org_id: profile.org_id, name: a.name, industry: a.industry, contract_value_annual: a.value,
      health_score_know: a.k, health_score_engage: a.e, health_score_exceed: a.ex, health_score_prevent: a.p,
      assigned_user_id: profile.id, status: a.status, pipeline_id: pipeline?.id,
      stage_id: a.status === 'at_risk' ? findStage('risk') : findStage('active'),
      renewal_date: renew.toISOString().slice(0, 10), last_interaction_at: last.toISOString(),
    }).select().single()
    ids.push(acc?.id || '')
  }

  for (const c of CONTACTS) {
    if (!ids[c.ai]) continue
    await supabase.from('contacts').insert({ account_id: ids[c.ai], org_id: profile.org_id, full_name: c.name, role_type: c.role, job_title: c.title, is_primary: true })
  }

  for (const i of INTERACTIONS) {
    if (!ids[i.ai]) continue
    const d = new Date(); d.setDate(d.getDate() - i.days)
    await supabase.from('interactions').insert({ account_id: ids[i.ai], org_id: profile.org_id, user_id: profile.id, channel: i.ch, direction: i.dir, subject: i.subj, content: i.content, created_at: d.toISOString() })
  }

  return NextResponse.json({ success: true, accounts: ids.length })
}

export async function DELETE() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 })

  const demoNames = ACCOUNTS.map(a => a.name)
  for (const name of demoNames) {
    await supabase.from('accounts').delete().eq('org_id', profile.org_id).eq('name', name)
  }
  return NextResponse.json({ success: true })
}
