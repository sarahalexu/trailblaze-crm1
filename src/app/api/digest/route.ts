// src/app/api/digest/route.ts
// Weekly email digest — sends every Monday at 7am WAT
// Cron URL: /api/digest?secret=YOUR_CRON_SECRET
// Schedule: Every Monday at 06:00 UTC (07:00 WAT)

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET || 'tb-cron-2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = getAdminClient()
  const now = new Date()
  let digestsSent = 0

  // Get all active users
  const { data: users } = await sb.from('users').select('id, email, full_name, org_id, role').eq('is_active', true)

  for (const user of users || []) {
    // Get their accounts
    const { data: accounts } = await sb.from('accounts').select('name, health_score_total, health_status, contract_value_annual, renewal_date, last_interaction_at')
      .eq('org_id', user.org_id)

    if (!accounts || accounts.length === 0) continue

    const atRisk = accounts.filter(a => a.health_status === 'at_risk' || a.health_status === 'critical')
    const revenueAtRisk = atRisk.reduce((s, a) => s + (a.contract_value_annual || 0), 0)

    // Overdue follow-ups
    const { data: overdue } = await sb.from('interactions').select('subject, follow_up_date, account:accounts(name)')
      .eq('org_id', user.org_id).eq('follow_up_required', true)
      .lte('follow_up_date', now.toISOString().slice(0, 10))

    // Upcoming renewals (30 days)
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30)
    const renewals = accounts.filter(a => a.renewal_date && new Date(a.renewal_date) <= thirtyDays && new Date(a.renewal_date) >= now)

    // Skip if nothing to report
    if (atRisk.length === 0 && (overdue?.length || 0) === 0 && renewals.length === 0) continue

    const fmtN = (n: number) => n >= 1000000 ? '₦' + (n / 1000000).toFixed(1) + 'M' : '₦' + n.toLocaleString()
    const firstName = user.full_name?.split(' ')[0] || 'there'

    // Create in-app notification with summary
    await sb.from('notifications').insert({
      user_id: user.id, org_id: user.org_id, type: 'system',
      title: `Weekly digest: ${atRisk.length} at-risk, ${overdue?.length || 0} overdue, ${renewals.length} renewals`,
      message: [
        atRisk.length > 0 ? `${atRisk.length} account${atRisk.length !== 1 ? 's' : ''} at risk (${fmtN(revenueAtRisk)} revenue exposure): ${atRisk.slice(0, 3).map(a => a.name).join(', ')}${atRisk.length > 3 ? ` +${atRisk.length - 3} more` : ''}` : null,
        (overdue?.length || 0) > 0 ? `${overdue?.length} overdue follow-up${(overdue?.length || 0) !== 1 ? 's' : ''}: ${overdue?.slice(0, 3).map(o => `${(o.account as any)?.name || 'Unknown'} — ${o.subject}`).join('; ')}` : null,
        renewals.length > 0 ? `${renewals.length} renewal${renewals.length !== 1 ? 's' : ''} in the next 30 days: ${renewals.slice(0, 3).map(r => `${r.name} (${new Date(r.renewal_date!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })})`).join(', ')}` : null,
      ].filter(Boolean).join('\n\n'),
    })

    // Send email if MailerSend is configured
    const apiKey = process.env.MAILERLITE_API_KEY
    if (apiKey) {
      try {
        await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: { email: 'noreply@trailblazeafrica.com', name: 'TrailBlaze CRM' },
            to: [{ email: user.email, name: user.full_name }],
            subject: `Your weekly account health digest`,
            html: `<div style="max-width:520px;margin:0 auto;font-family:-apple-system,sans-serif;color:#1a1a1a;padding:20px">
              <div style="text-align:center;padding:20px 0"><div style="display:inline-block;width:40px;height:40px;background:#2b0548;border-radius:8px;line-height:40px;color:#e1b3ee;font-weight:600;font-size:16px">TB</div></div>
              <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px">
                <h2 style="font-size:18px;margin:0 0 4px">Good morning, ${firstName}</h2>
                <p style="font-size:13px;color:#666;margin:0 0 20px">Here's your weekly account health summary.</p>
                
                <div style="display:flex;gap:12px;margin-bottom:20px">
                  <div style="flex:1;background:#f8f4ff;border-radius:8px;padding:12px;text-align:center">
                    <div style="font-size:22px;font-weight:700;color:#2b0548">${accounts.length}</div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase">Accounts</div>
                  </div>
                  <div style="flex:1;background:${atRisk.length > 0 ? '#fef2f2' : '#ecfdf5'};border-radius:8px;padding:12px;text-align:center">
                    <div style="font-size:22px;font-weight:700;color:${atRisk.length > 0 ? '#dc2626' : '#1D9E75'}">${atRisk.length}</div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase">At risk</div>
                  </div>
                  <div style="flex:1;background:#fffbeb;border-radius:8px;padding:12px;text-align:center">
                    <div style="font-size:22px;font-weight:700;color:#d97706">${renewals.length}</div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase">Renewals</div>
                  </div>
                </div>

                ${atRisk.length > 0 ? `<div style="margin-bottom:16px"><h3 style="font-size:13px;color:#dc2626;margin:0 0 8px">⚠ Accounts needing attention</h3>${atRisk.slice(0, 5).map(a => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:12px"><span style="font-weight:500">${a.name}</span><span style="color:#dc2626">${a.health_score_total}/20</span></div>`).join('')}</div>` : ''}
                
                ${(overdue?.length || 0) > 0 ? `<div style="margin-bottom:16px"><h3 style="font-size:13px;color:#d97706;margin:0 0 8px">⏰ Overdue follow-ups</h3>${(overdue || []).slice(0, 5).map(o => `<div style="padding:4px 0;font-size:12px;color:#666">${(o.account as any)?.name}: ${o.subject}</div>`).join('')}</div>` : ''}

                <a href="https://crm.trailblazeafrica.com/dashboard" style="display:block;text-align:center;padding:10px;background:#2b0548;color:#e1b3ee;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;margin-top:16px">Open TrailBlaze CRM</a>
              </div>
              <p style="text-align:center;font-size:11px;color:#999;margin-top:16px">TrailBlaze Africa · crm.trailblazeafrica.com</p>
            </div>`,
          }),
        })
      } catch (e) {
        console.error('Digest email failed for', user.email, e)
      }
    }

    digestsSent++
  }

  return NextResponse.json({ sent: digestsSent, timestamp: now.toISOString() })
}
