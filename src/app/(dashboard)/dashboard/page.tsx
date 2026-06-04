// src/app/(dashboard)/dashboard/page.tsx
// REDESIGNED: Modern clean dashboard with consistent typography and spacing

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SetupChecklist from '@/components/ui/SetupChecklist'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [metrics, setMetrics] = useState({ accounts: 0, revenue: 0, avgHealth: 0, atRiskRevenue: 0, newAccounts: 0, healthChange: 0, atRiskCount: 0 })
  const [healthBreakdown, setHealthBreakdown] = useState({ healthy: 0, at_risk: 0, critical: 0 })
  const [keepAvg, setKeepAvg] = useState({ k: 0, e: 0, ex: 0, p: 0 })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [atRiskAccounts, setAtRiskAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: profile } = await supabase.from('users').select('*, organizations(*)').eq('auth_id', authUser.id).single()
    if (!profile) return
    setUser(profile)
    const orgId = profile.org_id

    // Accounts
    const { data: accounts } = await supabase.from('accounts').select('id, name, health_status, health_score_total, health_score_know, health_score_engage, health_score_exceed, health_score_prevent, contract_value_annual, created_at').eq('org_id', orgId)
    const all = accounts || []
    const totalAccounts = all.length
    const totalRevenue = all.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const avgHealth = totalAccounts > 0 ? Math.round((all.reduce((s, a) => s + (a.health_score_total || 0), 0) / totalAccounts) * 10) / 10 : 0
    const healthy = all.filter(a => a.health_status === 'healthy').length
    const atRisk = all.filter(a => a.health_status === 'at_risk').length
    const critical = all.filter(a => a.health_status === 'critical').length
    const atRiskRev = all.filter(a => a.health_status !== 'healthy').reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const newAccounts = all.filter(a => a.created_at >= thirtyDaysAgo).length

    // KEEP averages
    const kAvg = totalAccounts > 0 ? Math.round((all.reduce((s, a) => s + (a.health_score_know || 0), 0) / totalAccounts) * 10) / 10 : 0
    const eAvg = totalAccounts > 0 ? Math.round((all.reduce((s, a) => s + (a.health_score_engage || 0), 0) / totalAccounts) * 10) / 10 : 0
    const exAvg = totalAccounts > 0 ? Math.round((all.reduce((s, a) => s + (a.health_score_exceed || 0), 0) / totalAccounts) * 10) / 10 : 0
    const pAvg = totalAccounts > 0 ? Math.round((all.reduce((s, a) => s + (a.health_score_prevent || 0), 0) / totalAccounts) * 10) / 10 : 0

    setMetrics({ accounts: totalAccounts, revenue: totalRevenue, avgHealth, atRiskRevenue: atRiskRev, newAccounts, healthChange: 0, atRiskCount: atRisk + critical })
    setHealthBreakdown({ healthy, at_risk: atRisk, critical })
    setKeepAvg({ k: kAvg, e: eAvg, ex: exAvg, p: pAvg })

    // At-risk accounts
    setAtRiskAccounts(
      all.filter(a => a.health_status !== 'healthy')
        .sort((a, b) => (a.health_score_total || 0) - (b.health_score_total || 0))
        .slice(0, 5)
    )

    // Recent activity (synced emails + interactions)
    const activity: any[] = []
    const { data: emails } = await supabase.from('synced_emails').select('id, direction, subject, from_name, from_address, sent_at, contact:contacts(full_name), account:accounts(name)').eq('org_id', orgId).order('sent_at', { ascending: false }).limit(4)
    for (const e of emails || []) {
      activity.push({ id: e.id, type: 'email', title: e.subject || 'Email', subtitle: e.direction === 'inbound' ? (e.contact?.full_name || e.from_name || e.from_address) : `You to ${e.contact?.full_name || 'contact'}`, account: e.account?.name, time: e.sent_at })
    }
    const { data: ints } = await supabase.from('interactions').select('id, channel, subject, created_at, contact:contacts(full_name), account:accounts(name)').eq('org_id', orgId).in('channel', ['call', 'meeting']).order('created_at', { ascending: false }).limit(3)
    for (const i of ints || []) {
      activity.push({ id: i.id, type: i.channel, title: i.subject || i.channel, subtitle: i.contact?.full_name || '', account: i.account?.name, time: i.created_at })
    }
    activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setRecentActivity(activity.slice(0, 5))

    // Tasks
    const { data: taskData } = await supabase.from('tasks').select('id, title, task_type, due_date, status, account:accounts(name)').eq('org_id', orgId).neq('status', 'completed').order('due_date', { ascending: true, nullsFirst: false }).limit(6)
    setTasks(taskData || [])

    setLoading(false)
  }

  async function completeTask(id: string) {
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function formatNaira(n: number): string {
    if (n >= 1000000) return '\u20A6' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '\u20A6' + (n / 1000).toFixed(0) + 'K'
    return '\u20A6' + n.toLocaleString()
  }

  function formatTime(d: string): string {
    const date = new Date(d); const now = new Date()
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    return 'Yesterday'
  }

  function getDueLabel(d: string | null): { text: string; style: string } {
    if (!d) return { text: '', style: '' }
    const today = new Date().toISOString().split('T')[0]
    if (d < today) return { text: 'Overdue', style: 'bg-red-50 text-red-700' }
    if (d === today) return { text: 'Today', style: 'bg-amber-50 text-amber-700' }
    const diff = Math.floor((new Date(d + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    if (diff === 1) return { text: 'Tomorrow', style: 'bg-blue-50 text-blue-700' }
    return { text: new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }), style: 'bg-gray-100 text-gray-600' }
  }

  const typeIcons: Record<string, { icon: string; bg: string; color: string }> = {
    email: { icon: '\u2709', bg: '#FBEAF0', color: '#993556' },
    whatsapp: { icon: '\u{1F4AC}', bg: '#E1F5EE', color: '#0F6E56' },
    call: { icon: '\u{1F4DE}', bg: '#E6F1FB', color: '#185FA5' },
    meeting: { icon: '\u{1F91D}', bg: '#E6F1FB', color: '#185FA5' },
  }

  const taskIcons: Record<string, string> = { task: '\u{1F4CB}', call: '\u{1F4DE}', email: '\u2709', meeting: '\u{1F91D}', follow_up: '\u{1F514}' }
  const totalHealth = healthBreakdown.healthy + healthBreakdown.at_risk + healthBreakdown.critical

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || ''
  const todayTasks = tasks.filter(t => t.due_date === new Date().toISOString().split('T')[0]).length
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length

  return (
    <div>
      <SetupChecklist />

      <h1 className="text-xl font-semibold text-gray-900 mb-0.5">{greeting}, {firstName}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {todayTasks > 0 && `${todayTasks} task${todayTasks > 1 ? 's' : ''} due today`}
        {todayTasks > 0 && overdueTasks > 0 && ' \u00B7 '}
        {overdueTasks > 0 && <span className="text-red-500">{overdueTasks} overdue</span>}
        {todayTasks === 0 && overdueTasks === 0 && metrics.atRiskCount > 0 && `${metrics.atRiskCount} account${metrics.atRiskCount > 1 ? 's' : ''} need attention`}
        {todayTasks === 0 && overdueTasks === 0 && metrics.atRiskCount === 0 && 'You are all caught up'}
      </p>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total accounts', value: metrics.accounts.toString(), change: `+${metrics.newAccounts} this month`, up: true },
          { label: 'Annual revenue', value: formatNaira(metrics.revenue) },
          { label: 'Avg health score', value: `${metrics.avgHealth}/20`, up: metrics.avgHealth >= 14 },
          { label: 'At-risk revenue', value: formatNaira(metrics.atRiskRevenue), change: `${metrics.atRiskCount} accounts`, up: false },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1.5">{m.label}</p>
            <p className={`text-xl font-semibold ${i === 3 && metrics.atRiskCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{m.value}</p>
            {m.change && <p className={`text-xs mt-1 ${m.up ? 'text-green-600' : i === 3 ? 'text-red-500' : 'text-gray-400'}`}>{m.change}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* KEEP health */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Portfolio health (KEEP)</h2>
              <Link href="/reports" className="text-xs hover:underline" style={{ color: '#5a1890' }}>View report</Link>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className={`text-2xl font-semibold ${metrics.avgHealth >= 15 ? 'text-green-700' : metrics.avgHealth >= 10 ? 'text-amber-700' : 'text-red-700'}`}>{metrics.avgHealth}</p>
                <p className="text-[10px] text-gray-400">avg /20</p>
              </div>
              {[
                { name: 'Know', score: keepAvg.k, color: '#5a1890' },
                { name: 'Engage', score: keepAvg.e, color: '#00adef' },
                { name: 'Exceed', score: keepAvg.ex, color: '#c9a54e' },
                { name: 'Prevent', score: keepAvg.p, color: '#1D9E75' },
              ].map(d => (
                <div key={d.name} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-500">{d.name}</span>
                    <span className="text-xs font-semibold" style={{ color: d.color }}>{d.score}</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(d.score / 5) * 100}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>

            {totalHealth > 0 && (
              <>
                <div className="flex h-2 rounded-full overflow-hidden mb-2">
                  <div style={{ width: `${(healthBreakdown.healthy / totalHealth) * 100}%`, background: '#1D9E75' }} />
                  <div style={{ width: `${(healthBreakdown.at_risk / totalHealth) * 100}%`, background: '#c9a54e' }} />
                  <div style={{ width: `${(healthBreakdown.critical / totalHealth) * 100}%`, background: '#E24B4A' }} />
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#1D9E75' }} /> Healthy ({healthBreakdown.healthy})</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#c9a54e' }} /> At risk ({healthBreakdown.at_risk})</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#E24B4A' }} /> Critical ({healthBreakdown.critical})</span>
                </div>
              </>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-medium text-gray-900">Recent activity</h2>
              <Link href="/interactions" className="text-xs hover:underline" style={{ color: '#5a1890' }}>View inbox</Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="px-5 pb-5 text-center py-6">
                <p className="text-xs text-gray-400">No recent activity. Connect Gmail or WhatsApp to see conversations here.</p>
              </div>
            ) : recentActivity.map((a, i) => {
              const icon = typeIcons[a.type] || typeIcons.email
              return (
                <div key={a.id} className={`flex items-start gap-3 px-5 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: icon.bg, color: icon.color }}>
                    {a.type === 'email' ? '\u2709' : a.type === 'call' ? '\u{1F4DE}' : '\u{1F91D}'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 truncate">{a.subtitle}{a.account ? ` \u00B7 ${a.account}` : ''}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(a.time)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: 1/3 */}
        <div className="space-y-5">
          {/* Tasks */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-medium text-gray-900">Tasks</h2>
              <Link href="/tasks" className="text-xs hover:underline" style={{ color: '#5a1890' }}>View all</Link>
            </div>
            {tasks.length === 0 ? (
              <div className="px-5 pb-5 text-center py-6">
                <p className="text-xs text-gray-400">No pending tasks. You're all caught up.</p>
              </div>
            ) : tasks.map((t, i) => {
              const due = getDueLabel(t.due_date)
              return (
                <div key={t.id} className={`flex items-center gap-3 px-5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <button onClick={() => completeTask(t.id)} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-gray-300 flex-shrink-0 hover:border-purple-400 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{t.title}</p>
                    {t.account?.name && <p className="text-[11px] text-gray-400 truncate">{t.account.name}</p>}
                  </div>
                  {due.text && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${due.style}`}>{due.text}</span>}
                </div>
              )
            })}
            <div className="px-5 py-3 border-t border-gray-100">
              <Link href="/tasks" className="text-xs font-medium hover:underline" style={{ color: '#5a1890' }}>+ Add task</Link>
            </div>
          </div>

          {/* At-risk accounts */}
          {atRiskAccounts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <span className="text-sm text-red-500">{'\u26A0'}</span>
                <h2 className="text-sm font-medium text-gray-900">Accounts needing attention</h2>
              </div>
              {atRiskAccounts.map((a, i) => (
                <Link key={a.id} href={`/accounts/${a.id}`} className={`flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.health_status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <span className="text-sm text-gray-900 flex-1 truncate">{a.name}</span>
                  <span className={`text-xs font-medium ${a.health_score_total < 8 ? 'text-red-600' : 'text-amber-600'}`}>{a.health_score_total}/20</span>
                  <span className="text-[11px] text-gray-400">{formatNaira(a.contract_value_annual || 0)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
