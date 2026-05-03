// src/app/api/reminders/check/route.ts
// Checks for overdue follow-ups and upcoming renewals, creates notifications
// Add to cron-job.org: run every 6 hours
// URL: /api/reminders/check?secret=YOUR_CRON_SECRET

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET || 'tb-cron-2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = getAdminClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  let notifications = 0

  // 1. Overdue follow-ups (follow_up_date has passed)
  const { data: overdue } = await sb.from('interactions')
    .select('id, subject, follow_up_date, user_id, org_id, account_id, account:accounts(name)')
    .eq('follow_up_required', true)
    .lte('follow_up_date', today)

  for (const item of overdue || []) {
    if (!item.user_id) continue
    // Check if we already sent a notification for this
    const { data: existing } = await sb.from('notifications')
      .select('id').eq('reference_id', item.id).eq('type', 'overdue_followup').limit(1)
    if (existing && existing.length > 0) continue

    const accountName = (item.account as any)?.name || 'an account'
    await sb.from('notifications').insert({
      user_id: item.user_id, org_id: item.org_id, type: 'overdue_followup',
      title: `Overdue follow-up: ${accountName}`,
      message: `You have an overdue follow-up "${item.subject}" that was due on ${new Date(item.follow_up_date!).toLocaleDateString('en-NG')}. Log an interaction to mark it complete.`,
      reference_type: 'interaction', reference_id: item.id,
    })
    notifications++
  }

  // 2. Renewal reminders (90, 60, 30, 14, 7 days before)
  const reminderDays = [90, 60, 30, 14, 7]
  for (const days of reminderDays) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const target = targetDate.toISOString().slice(0, 10)

    const { data: renewals } = await sb.from('accounts')
      .select('id, name, renewal_date, assigned_user_id, org_id, contract_value_annual')
      .eq('renewal_date', target)

    for (const acc of renewals || []) {
      if (!acc.assigned_user_id) continue
      // Check if we already notified about this renewal at this day count
      const notifKey = `renewal_${acc.id}_${days}`
      const { data: existing } = await sb.from('notifications')
        .select('id').eq('reference_id', acc.id).eq('type', 'renewal_approaching')
        .ilike('title', `%${days} day%`).limit(1)
      if (existing && existing.length > 0) continue

      const fmtN = (n: number) => n >= 1000000 ? '₦' + (n / 1000000).toFixed(1) + 'M' : '₦' + n.toLocaleString()
      await sb.from('notifications').insert({
        user_id: acc.assigned_user_id, org_id: acc.org_id, type: 'renewal_approaching',
        title: `${acc.name}: Renewal in ${days} days`,
        message: `${acc.name}'s contract (${acc.contract_value_annual ? fmtN(acc.contract_value_annual) + '/yr' : 'value not set'}) renews on ${new Date(acc.renewal_date!).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}. Start the renewal conversation now.`,
        reference_type: 'account', reference_id: acc.id,
      })
      notifications++
    }
  }

  // 3. Accounts with no interaction in 14+ days
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const { data: stale } = await sb.from('accounts')
    .select('id, name, assigned_user_id, org_id, last_interaction_at, health_status')
    .in('health_status', ['at_risk', 'critical'])
    .lte('last_interaction_at', twoWeeksAgo.toISOString())

  for (const acc of stale || []) {
    if (!acc.assigned_user_id) continue
    const daysSince = Math.floor((now.getTime() - new Date(acc.last_interaction_at!).getTime()) / 86400000)

    // Only notify once per week for stale accounts
    const { data: recent } = await sb.from('notifications')
      .select('id').eq('reference_id', acc.id).eq('type', 'health_change')
      .gte('created_at', new Date(now.getTime() - 7 * 86400000).toISOString()).limit(1)
    if (recent && recent.length > 0) continue

    await sb.from('notifications').insert({
      user_id: acc.assigned_user_id, org_id: acc.org_id, type: 'health_change',
      title: `${acc.name}: No contact in ${daysSince} days`,
      message: `This ${acc.health_status === 'critical' ? 'critical' : 'at-risk'} account hasn't been contacted in ${daysSince} days. Reach out before the relationship deteriorates further.`,
      reference_type: 'account', reference_id: acc.id,
    })
    notifications++
  }

  return NextResponse.json({ notifications_created: notifications, timestamp: now.toISOString() })
}
