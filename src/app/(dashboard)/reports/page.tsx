// src/app/(dashboard)/reports/page.tsx
// MERGED: Analytics + Reports into one page with tabs, charts, PDF download

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// SVG Donut Chart
function DonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ width: size, height: size }} className="flex items-center justify-center text-xs text-gray-400">No data</div>
  const r = size / 2 - 10; const cx = size / 2; const cy = size / 2; let cumAngle = -90
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.filter(d => d.value > 0).map((d, i) => {
        const angle = (d.value / total) * 360; const startAngle = cumAngle; cumAngle += angle
        const startRad = (startAngle * Math.PI) / 180; const endRad = ((startAngle + angle) * Math.PI) / 180
        const x1 = cx + r * Math.cos(startRad); const y1 = cy + r * Math.sin(startRad)
        const x2 = cx + r * Math.cos(endRad); const y2 = cy + r * Math.sin(endRad)
        const large = angle > 180 ? 1 : 0
        if (angle >= 359.9) return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="20" />
        return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={d.color} />
      })}
      <circle cx={cx} cy={cy} r={r - 20} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 18, fontWeight: 600 }}>{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 11 }}>total</text>
    </svg>
  )
}

// SVG Bar Chart
function BarChart({ data, height = 160 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.min(32, Math.floor(280 / data.length) - 8)
  return (
    <div className="flex items-end justify-center gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-700">{d.value > 0 ? d.value : ''}</span>
          <div style={{ width: barW, height: Math.max(4, (d.value / max) * (height - 40)), background: d.color, borderRadius: 4 }} />
          <span className="text-[10px] text-gray-500 truncate" style={{ maxWidth: barW + 16 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Mini horizontal bar
function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex-1"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
}

type TabKey = 'overview' | 'accounts' | 'team' | 'revenue'

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('overview')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<any>({})
  const supabase = createClient()
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [period, customFrom, customTo])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return
    const orgId = profile.org_id

    let since: string
    let until: string | null = null

    if (period === 'custom' && customFrom) {
      since = new Date(customFrom + 'T00:00:00').toISOString()
      until = customTo ? new Date(customTo + 'T23:59:59').toISOString() : null
    } else if (period === 'all') {
      since = new Date(0).toISOString()
    } else {
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90
      since = new Date(Date.now() - daysAgo * 86400000).toISOString()
    }

    let emailsQuery = supabase
      .from('synced_emails')
      .select('id, direction, sent_at')
      .eq('org_id', orgId)
      .gte('sent_at', since)

    if (until) {
      emailsQuery = emailsQuery.lte('sent_at', until)
    }

    const [accountsRes, interactionsRes, usersRes, dealsRes, emailsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('org_id', orgId),
      supabase.from('interactions').select('user_id, channel, created_at, follow_up_required').eq('org_id', orgId),
      supabase.from('users').select('id, full_name, role').eq('org_id', orgId).eq('is_active', true),
      supabase.from('deals').select('value, status, stage_id, created_at').eq('org_id', orgId),
      emailsQuery,
    ])

    const accounts = accountsRes.data || []
    const interactions = interactionsRes.data || []
    const users = usersRes.data || []
    const deals = dealsRes.data || []
    const emails = emailsRes.data || []

    const healthy = accounts.filter(a => a.health_status === 'healthy')
    const atRisk = accounts.filter(a => a.health_status === 'at_risk')
    const critical = accounts.filter(a => a.health_status === 'critical')
    const totalRevenue = accounts.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const atRiskRevenue = [...atRisk, ...critical].reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const avgHealth = accounts.length > 0 ? Math.round((accounts.reduce((s, a) => s + (a.health_score_total || 0), 0) / accounts.length) * 10) / 10 : 0

    const recentInteractions = interactions.filter(i => {
      if (until) return i.created_at >= since && i.created_at <= until
      return i.created_at >= since
    })

    const recentDeals = deals.filter(dl => {
      if (until) return dl.created_at >= since && dl.created_at <= until
      return dl.created_at >= since
    })

    const channels: Record<string, number> = {}
    for (const i of recentInteractions) channels[i.channel] = (channels[i.channel] || 0) + 1

    const userActivity: Record<string, number> = {}
    for (const i of recentInteractions) { if (i.user_id) userActivity[i.user_id] = (userActivity[i.user_id] || 0) + 1 }
    const teamPerformance = users.map(u => ({
      name: u.full_name, role: u.role,
      interactions: userActivity[u.id] || 0,
      accounts: accounts.filter(a => a.assigned_user_id === u.id).length,
    })).sort((a, b) => b.interactions - a.interactions)

    const keepAvg = accounts.length > 0 ? {
      k: Math.round((accounts.reduce((s, a) => s + (a.health_score_know || 0), 0) / accounts.length) * 10) / 10,
      e: Math.round((accounts.reduce((s, a) => s + (a.health_score_engage || 0), 0) / accounts.length) * 10) / 10,
      ex: Math.round((accounts.reduce((s, a) => s + (a.health_score_exceed || 0), 0) / accounts.length) * 10) / 10,
      p: Math.round((accounts.reduce((s, a) => s + (a.health_score_prevent || 0), 0) / accounts.length) * 10) / 10,
    } : { k: 0, e: 0, ex: 0, p: 0 }

    const dealWon = recentDeals.filter(dl => dl.status === 'won').reduce((s, dl) => s + (dl.value || 0), 0)
    const dealLost = recentDeals.filter(dl => dl.status === 'lost').reduce((s, dl) => s + (dl.value || 0), 0)
    const dealOpen = recentDeals.filter(dl => dl.status === 'open' || !dl.status).reduce((s, dl) => s + (dl.value || 0), 0)

    const industries: Record<string, number> = {}
    for (const a of accounts) { const ind = a.industry || 'Other'; industries[ind] = (industries[ind] || 0) + 1 }

    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const inactive = accounts.filter(a => !a.last_interaction_at || a.last_interaction_at < thirtyAgo)

    setD({
      accounts, healthy, atRisk, critical, totalRevenue, atRiskRevenue, avgHealth,
      recentInteractions, emails, channels, teamPerformance, keepAvg,
      dealWon, dealLost, dealOpen, deals, industries, inactive, users,
    })
    setLoading(false)
  }

  function formatNaira(n: number): string {
    if (n >= 1000000) return '\u20A6' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '\u20A6' + (n / 1000).toFixed(0) + 'K'
    return '\u20A6' + n.toLocaleString()
  }

  async function exportReport() {
    const el = reportRef.current
    if (!el) return
    try {
      const content = el.innerText
      const blob = new Blob([`TrailBlaze CRM Report\nGenerated: ${new Date().toLocaleString()}\nPeriod: ${period === 'custom' ? `${customFrom} to ${customTo || 'now'}` : period}\n\n${content}`], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `trailblaze-report-${period}.txt`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export failed. Try again.') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  const maxInteractions = Math.max(...(d.teamPerformance || []).map((t: any) => t.interactions), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">{d.accounts?.length || 0} accounts, {formatNaira(d.totalRevenue || 0)} total revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {(['7d', '30d', '90d', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md font-medium ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {p === 'all' ? 'All time' : p}
              </button>
            ))}
            <button onClick={() => setPeriod('custom')}
              className={`px-2.5 py-1 rounded-md font-medium ${period === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Custom
            </button>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs" />
            </div>
          )}
          <button onClick={exportReport} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
            {'\u{1F4E5}'} Export report
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-5 w-fit">
        {([
          { key: 'overview' as TabKey, label: 'Overview' },
          { key: 'accounts' as TabKey, label: 'Accounts' },
          { key: 'team' as TabKey, label: 'Team' },
          { key: 'revenue' as TabKey, label: 'Revenue' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div ref={reportRef}>
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total accounts', value: d.accounts?.length || 0 },
                { label: 'Annual revenue', value: formatNaira(d.totalRevenue || 0) },
                { label: 'Avg health score', value: `${d.avgHealth || 0}/20` },
                { label: 'At-risk revenue', value: formatNaira(d.atRiskRevenue || 0), red: true },
              ].map((m, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                  <p className={`text-xl font-semibold ${m.red ? 'text-red-600' : 'text-gray-900'}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Health distribution</h3>
                <div className="flex items-center gap-6">
                  <DonutChart data={[
                    { label: 'Healthy', value: d.healthy?.length || 0, color: '#1D9E75' },
                    { label: 'At risk', value: d.atRisk?.length || 0, color: '#c9a54e' },
                    { label: 'Critical', value: d.critical?.length || 0, color: '#E24B4A' },
                  ]} size={140} />
                  <div className="space-y-2">
                    {[
                      { label: 'Healthy', count: d.healthy?.length || 0, color: '#1D9E75' },
                      { label: 'At risk', count: d.atRisk?.length || 0, color: '#c9a54e' },
                      { label: 'Critical', count: d.critical?.length || 0, color: '#E24B4A' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-sm text-gray-700">{s.label}</span>
                        <span className="text-sm font-medium text-gray-900 ml-auto">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">KEEP framework averages</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Know', score: d.keepAvg?.k || 0, color: '#5a1890' },
                    { name: 'Engage', score: d.keepAvg?.e || 0, color: '#00adef' },
                    { name: 'Exceed', score: d.keepAvg?.ex || 0, color: '#c9a54e' },
                    { name: 'Prevent', score: d.keepAvg?.p || 0, color: '#1D9E75' },
                  ].map(dim => (
                    <div key={dim.name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-16">{dim.name}</span>
                      <HBar value={dim.score} max={5} color={dim.color} />
                      <span className="text-sm font-medium w-8 text-right" style={{ color: dim.color }}>{dim.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Activity by channel</h3>
                <BarChart data={[
                  { label: 'Email', value: (d.channels?.email || 0) + (d.emails?.length || 0), color: '#993556' },
                  { label: 'Call', value: d.channels?.call || 0, color: '#185FA5' },
                  { label: 'Meeting', value: d.channels?.meeting || 0, color: '#00adef' },
                  { label: 'WhatsApp', value: d.channels?.whatsapp || 0, color: '#1D9E75' },
                  { label: 'Other', value: (d.channels?.other || 0) + (d.channels?.in_person || 0), color: '#888780' },
                ]} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Accounts by industry</h3>
                <BarChart data={Object.entries(d.industries || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([label, value]: any, i: number) => ({
                  label, value, color: ['#5a1890', '#00adef', '#c9a54e', '#1D9E75', '#993556', '#185FA5'][i % 6],
                }))} />
              </div>
            </div>
          </div>
        )}

        {tab === 'accounts' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-green-700">{d.healthy?.length || 0}</p>
                <p className="text-xs text-green-600">Healthy</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-amber-700">{d.atRisk?.length || 0}</p>
                <p className="text-xs text-amber-600">At risk</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-red-700">{d.critical?.length || 0}</p>
                <p className="text-xs text-red-600">Critical</p>
              </div>
            </div>

            {(d.inactive?.length || 0) > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-medium text-gray-900">Inactive accounts (no contact in 30+ days)</h3></div>
                {(d.inactive || []).slice(0, 10).map((a: any, i: number) => (
                  <div key={a.id} className={`flex items-center justify-between px-5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <span className="text-sm text-gray-900">{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${(a.health_score_total || 0) >= 15 ? 'text-green-700' : (a.health_score_total || 0) >= 10 ? 'text-amber-700' : 'text-red-700'}`}>{a.health_score_total || 0}/20</span>
                      <span className="text-xs text-gray-400">{formatNaira(a.contract_value_annual || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-medium text-gray-900">All accounts by health score</h3></div>
              {(d.accounts || []).sort((a: any, b: any) => (a.health_score_total || 0) - (b.health_score_total || 0)).slice(0, 15).map((a: any, i: number) => (
                <div key={a.id} className={`flex items-center gap-3 px-5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className={`w-2 h-2 rounded-full ${a.health_status === 'healthy' ? 'bg-green-500' : a.health_status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-900 flex-1">{a.name}</span>
                  <div className="flex gap-0.5">
                    {[{ s: a.health_score_know, c: '#5a1890' }, { s: a.health_score_engage, c: '#00adef' }, { s: a.health_score_exceed, c: '#c9a54e' }, { s: a.health_score_prevent, c: '#1D9E75' }].map((dim, j) => (
                      <div key={j} className="w-5 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(dim.s || 0) * 20}%`, background: dim.c }} /></div>
                    ))}
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${(a.health_score_total || 0) >= 15 ? 'text-green-700' : (a.health_score_total || 0) >= 10 ? 'text-amber-700' : 'text-red-700'}`}>{a.health_score_total || 0}/20</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{formatNaira(a.contract_value_annual || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Team members</p>
                <p className="text-xl font-semibold text-gray-900">{d.users?.length || 0}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total interactions ({period === 'custom' ? 'custom' : period})</p>
                <p className="text-xl font-semibold text-gray-900">{d.recentInteractions?.length || 0}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Emails synced ({period === 'custom' ? 'custom' : period})</p>
                <p className="text-xl font-semibold text-gray-900">{d.emails?.length || 0}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-medium text-gray-900">Team performance</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Accounts</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Interactions</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 w-40">Activity</th>
                  </tr></thead>
                  <tbody>
                    {(d.teamPerformance || []).map((t: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 px-5 font-medium text-gray-900">{t.name}</td>
                        <td className="py-3 px-4 text-gray-500 capitalize">{t.role}</td>
                        <td className="py-3 px-4 text-gray-700">{t.accounts}</td>
                        <td className="py-3 px-4 text-gray-700">{t.interactions}</td>
                        <td className="py-3 px-4"><HBar value={t.interactions} max={maxInteractions} color="#5a1890" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'revenue' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total pipeline</p>
                <p className="text-xl font-semibold text-gray-900">{formatNaira((d.dealWon || 0) + (d.dealOpen || 0) + (d.dealLost || 0))}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Won</p>
                <p className="text-xl font-semibold text-green-700">{formatNaira(d.dealWon || 0)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Open</p>
                <p className="text-xl font-semibold text-blue-700">{formatNaira(d.dealOpen || 0)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Lost</p>
                <p className="text-xl font-semibold text-red-700">{formatNaira(d.dealLost || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Pipeline breakdown</h3>
                <div className="flex items-center gap-6">
                  <DonutChart data={[
                    { label: 'Won', value: d.dealWon || 0, color: '#1D9E75' },
                    { label: 'Open', value: d.dealOpen || 0, color: '#00adef' },
                    { label: 'Lost', value: d.dealLost || 0, color: '#E24B4A' },
                  ]} size={140} />
                  <div className="space-y-2">
                    {[
                      { label: 'Won', value: formatNaira(d.dealWon || 0), color: '#1D9E75' },
                      { label: 'Open', value: formatNaira(d.dealOpen || 0), color: '#00adef' },
                      { label: 'Lost', value: formatNaira(d.dealLost || 0), color: '#E24B4A' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-sm text-gray-700">{s.label}</span>
                        <span className="text-sm font-medium text-gray-900 ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Revenue at risk</h3>
                <p className="text-3xl font-semibold text-red-600 mb-2">{formatNaira(d.atRiskRevenue || 0)}</p>
                <p className="text-xs text-gray-500 mb-4">{(d.atRisk?.length || 0) + (d.critical?.length || 0)} accounts with at-risk or critical health</p>
                <div className="space-y-2">
                  {[...(d.atRisk || []), ...(d.critical || [])].sort((a: any, b: any) => (b.contract_value_annual || 0) - (a.contract_value_annual || 0)).slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{a.name}</span>
                      <span className="text-red-600 font-medium">{formatNaira(a.contract_value_annual || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}