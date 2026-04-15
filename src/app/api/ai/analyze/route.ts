import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId, action } = await request.json()
  if (!accountId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured. Add GEMINI_API_KEY in Vercel.' }, { status: 503 })

  const { data: account } = await supabase.from('accounts')
    .select('*, contacts:contacts(full_name, role_type, is_primary), interactions:interactions(channel, direction, subject, content, created_at)')
    .eq('id', accountId).single()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const ctx = `Account: ${account.name}\nIndustry: ${account.industry || 'Unknown'}\nContract: ₦${account.contract_value_annual?.toLocaleString() || 'N/A'}/yr\nKEEP: ${account.health_score_total}/20 (K:${account.health_score_know} E:${account.health_score_engage} Ex:${account.health_score_exceed} P:${account.health_score_prevent})\nStatus: ${account.health_status}\nRenewal: ${account.renewal_date || 'Not set'}\nLast contact: ${account.last_interaction_at || 'Never'}\nContacts: ${(account.contacts||[]).map((c:any)=>`${c.full_name} (${c.role_type})`).join(', ')||'None'}\nRecent activity: ${(account.interactions||[]).slice(0,8).map((i:any)=>`[${i.created_at?.slice(0,10)}] ${i.channel} ${i.direction}: ${i.subject||''}`).join('; ')||'None'}`

  const prompts: Record<string, string> = {
    risk_analysis: `Expert account management consultant. Analyze this account's churn risk. Be specific, reference the data. Format: RISK LEVEL (Low/Medium/High/Critical), KEY RISKS (2-3), RECOMMENDED ACTIONS (3-4 this week), WATCH FOR (1-2 early warnings). Concise, no generic advice.\n\n${ctx}`,
    draft_message: `Write a short, natural follow-up email from the account manager to ${(account.contacts||[]).find((c:any)=>c.is_primary)?.full_name||'the client'}. Warm, professional, not robotic. Under 120 words. No subject line. Reference something specific from the data.\n\n${ctx}`,
    next_action: `What is the single most important action for this account manager to take next? Be specific. Format: ACTION (one sentence), WHY (2 sentences referencing data), HOW (2-3 bullets), DEADLINE.\n\n${ctx}`,
  }

  if (!prompts[action]) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompts[action] }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 600 } }),
    })
    const data = await res.json()
    return NextResponse.json({ result: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate.', action })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
