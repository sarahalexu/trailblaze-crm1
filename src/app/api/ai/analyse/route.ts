// src/app/api/ai/analyse/route.ts
// AI-powered account analysis endpoints

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { analyseAccountRisk, draftFollowUpMessage, suggestNextActions, generateRenewalInsight } from '@/lib/ai/gemini'
import { rateLimit } from '@/lib/security'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 20 AI requests per minute
  const rl = rateLimit(`ai-${user.id}`, 20, 60000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  const { action, accountId, contactId, purpose, additionalContext } = await request.json()

  // Get user profile
  const { data: profile } = await supabase
    .from('users').select('id, org_id').eq('auth_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get account data
  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('org_id', profile.org_id)
    .single()

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // Get recent interactions
  const { data: interactions } = await supabase
    .from('interactions')
    .select('subject, content, channel, direction, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(10)

  const interactionSummaries = (interactions || []).map(i =>
    `${i.channel} ${i.direction}: ${i.subject || i.content?.slice(0, 100) || 'No content'}`
  )

  const lastInteractionDays = account.last_interaction_at
    ? Math.floor((Date.now() - new Date(account.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const renewalDays = account.renewal_date
    ? Math.ceil((new Date(account.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const keepScores = {
    know: account.health_score_know,
    engage: account.health_score_engage,
    exceed: account.health_score_exceed,
    prevent: account.health_score_prevent,
  }

  switch (action) {
    case 'risk_analysis': {
      const result = await analyseAccountRisk({
        name: account.name,
        healthScore: account.health_score_total,
        keepScores,
        lastInteractionDays,
        renewalDays,
        contractValue: account.contract_value_annual || 0,
        recentInteractions: interactionSummaries,
      })
      return NextResponse.json({ result })
    }

    case 'draft_message': {
      const { data: contact } = contactId
        ? await supabase.from('contacts').select('full_name').eq('id', contactId).single()
        : { data: null }

      const result = await draftFollowUpMessage({
        contactName: contact?.full_name || 'the client',
        accountName: account.name,
        purpose: purpose || 'check_in',
        lastInteraction: interactions?.[0]?.content?.slice(0, 200),
        healthScore: account.health_score_total,
        additionalContext,
      })
      return NextResponse.json({ result })
    }

    case 'next_actions': {
      const { data: assignments } = await supabase
        .from('playbook_assignments')
        .select('playbook:playbooks(name)')
        .eq('account_id', accountId)
        .eq('status', 'in_progress')

      const result = await suggestNextActions({
        name: account.name,
        healthScore: account.health_score_total,
        keepScores,
        stage: account.status || 'active',
        lastInteractionDays,
        renewalDays,
        activePlaybooks: (assignments || []).map((a: any) => a.playbook?.name).filter(Boolean),
        recentInteractions: interactionSummaries,
      })
      return NextResponse.json({ result })
    }

    case 'renewal_insight': {
      const { data: primaryContact } = await supabase
        .from('contacts').select('full_name')
        .eq('account_id', accountId).eq('is_primary', true).limit(1).single()

      const result = await generateRenewalInsight({
        accountName: account.name,
        contactName: primaryContact?.full_name || 'Primary contact',
        contractValue: account.contract_value_annual || 0,
        renewalDays: renewalDays || 0,
        healthScore: account.health_score_total,
        keepScores,
        interactionHistory: interactionSummaries,
      })
      return NextResponse.json({ result })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
