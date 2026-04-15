// src/app/(dashboard)/dashboard/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// SVG Donut Chart component
function DonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ width: size, height: size }} className="flex items-center justify-center text-xs text-gray-400">No data</div>
  const cx = size / 2, cy = size / 2, r = size * 0.38, strokeWidth = size * 0.15
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      {data.map((d, i) => {
        const pct = d.value / total
        const dashArray = `${pct * circumference} ${circumference}`
        const dashOffset = -offset * circumference
        offset += pct
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={strokeWidth}
          strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 0.8s ease' }} />
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-2xl font-semibold" fill="#111827" style={{ fontSize: size * 0.18, fontWeight: 600 }}>{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" style={{ fontSize: size * 0.08 }}>accounts</text>
    </svg>
  )
}

// Sparkline mini chart
function Sparkline({ data, color = '#5a1890', height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const w = 100, h = height
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ')
  const areaPoints = points + ` ${w},${h} 0,${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs><linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.15" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Bar chart
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-600">{d.value}</span>
          <div className="w-full rounded-t-md transition-all duration-700 ease-out" style={{
            height: `${Math.max((d.value / max) * 80, 4)}%`, background: d.color, minHeight: 4,
            animation: `growUp 0.6s ease ${i * 0.1}s both`,
          }} />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Demo data banner
function DemoBanner({ onGenerate }: { onGenerate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/demo/generate', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setDone(true); setTimeout(() => onGenerate(), 500) }
  }

  if (done) return (
    <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl text-center" style={{ animation: 'fadeIn 0.3s ease' }}>
      <span className="text-lg">🎉</span>
      <p className="text-sm text-green-800 font-medium mt-1">Demo data loaded! Your dashboard will update now.</p>
    </div>
  )

  return (
    <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5" style={{ animation: 'slideUp 0.3s ease' }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">🧪</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Your dashboard looks empty!</h3>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">Load demo data to see TrailBlaze CRM in action — 8 sample accounts with health scores, contacts, and interactions from Nigerian tech companies. You can delete them anytime from Settings.</p>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {loading ? 'Loading demo data...' : 'Load demo data'}
            </button>
            <Link href="/accounts/new" className="px-4 py-2 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-white">
              Or add real accounts
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [recentAccounts, setRecentAccounts] = useState<any[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id, full_name').eq('auth_id', user.id).single()
    if (!profile) return
    setUserName(profile.full_name?.split(' ')[0] || '')

    // Get all accounts
    const { data: accounts } = await supabase.from('accounts').select('*').eq('org_id', profile.org_id)
    const accs = accounts || []

    const healthy = accs.filter(a => a.health_status === 'healthy').length
    const atRisk = accs.filter(a => a.health_status === 'at_risk').length
    const critical = accs.filter(a => a.health_status === 'critical').length
    const totalRevenue = accs.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const revenueAtRisk = accs.filter(a => a.health_status === 'at_risk' || a.health_status === 'critical').reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const avgHealth = accs.length > 0 ? Math.round(accs.reduce((s, a) => s + (a.health_score_total || 0), 0) / accs.length) : 0

    // Upcoming renewals (next 30 days)
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30)
    const renewals = accs.filter(a => a.renewal_date && new Date(a.renewal_date) <= thirtyDays && new Date(a.renewal_date) >= new Date())

    // Recent interactions for activity sparkline
    const { data: interactions } = await supabase.from('interactions')
      .select('created_at').eq('org_id', profile.org_id)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at')

    // Group interactions by day for sparkline
    const dayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      dayMap[d.toISOString().slice(0, 10)] = 0
    }
    (interactions || []).forEach(i => { const d = i.created_at.slice(0, 10); if (dayMap[d] !== undefined) dayMap[d]++ })
    const sparkData = Object.values(dayMap)

    // Activity by channel
    const { data: channelData } = await supabase.from('interactions')
      .select('channel').eq('org_id', profile.org_id)
    const channels: Record<string, number> = {}
    ;(channelData || []).forEach(i => { channels[i.channel] = (channels[i.channel] || 0) + 1 })

    setActivityData([
      { label: 'Calls', value: channels['call'] || 0, color: '#5a1890' },
      { label: 'Email', value: channels['email'] || 0, color: '#00adef' },
      { label: 'WhatsApp', value: channels['whatsapp'] || 0, color: '#25D366' },
      { label: 'Meeting', value: channels['meeting'] || 0, color: '#c9a54e' },
      { label: 'Other', value: (channels['in_person'] || 0) + (channels['sms'] || 0) + (channels['other'] || 0), color: '#9ca3af' },
    ])

    // Recent accounts (by last interaction)
    const sorted = [...accs].sort((a, b) => (b.last_interaction_at || '').localeCompare(a.last_interaction_at || '')).slice(0, 5)

    setMetrics({ total: accs.length, healthy, atRisk, critical, totalRevenue, revenueAtRisk, avgHealth, renewals: renewals.length, renewalValue: renewals.reduce((s, a) => s + (a.contract_value_annual || 0), 0), sparkData })
    setRecentAccounts(sorted)
    setLoading(false)
  }

  function formatNaira(amount: number): string {
    if (amount >= 1000000) return '₦' + (amount / 1000000).toFixed(1) + 'M'
    if (amount >= 1000) return '₦' + (amount / 1000).toFixed(0) + 'K'
    return '₦' + amount.toLocaleString()
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-64 tb-skeleton" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 tb-skeleton rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 tb-skeleton rounded-xl" />
        <div className="h-72 tb-skeleton rounded-xl" />
      </div>
    </div>
  )

  const m = metrics || {}

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
          {greeting}, {userName} <span style={{ display: 'inline-block', animation: 'pulse-soft 2s infinite' }}>👋</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's how your accounts are doing today.</p>
      </div>

      {/* Demo data banner — show when no accounts */}
      {m.total === 0 && (
        <DemoBanner onGenerate={() => loadDashboard()} />
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total accounts', value: m.total, sub: `${m.healthy} healthy`, color: '#5a1890', icon: '◆' },
          { label: 'Avg. KEEP score', value: `${m.avgHealth}/20`, sub: m.avgHealth >= 15 ? 'Strong' : m.avgHealth >= 10 ? 'Needs attention' : 'Critical', color: m.avgHealth >= 15 ? '#1D9E75' : m.avgHealth >= 10 ? '#d97706' : '#dc2626', icon: '♥' },
          { label: 'Revenue at risk', value: formatNaira(m.revenueAtRisk), sub: `${m.atRisk + m.critical} accounts`, color: '#dc2626', icon: '⚠' },
          { label: 'Renewals (30d)', value: m.renewals, sub: formatNaira(m.renewalValue), color: '#c9a54e', icon: '↻' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: `slideUp 0.3s ease ${i * 0.05}s both` }}>
            {/* Accent bar */}
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: card.color }} />
            <div className="pl-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{card.label}</span>
                <span className="text-xs" style={{ color: card.color, opacity: 0.5 }}>{card.icon}</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: '-0.03em' }}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content — charts + accounts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Health distribution donut */}
        <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Account health</h3>
          <div className="flex items-center justify-center mb-4">
            <DonutChart data={[
              { label: 'Healthy', value: m.healthy, color: '#1D9E75' },
              { label: 'At risk', value: m.atRisk, color: '#d97706' },
              { label: 'Critical', value: m.critical, color: '#dc2626' },
            ]} />
          </div>
          <div className="flex justify-center gap-4">
            {[{ l: 'Healthy', c: '#1D9E75', v: m.healthy }, { l: 'At risk', c: '#d97706', v: m.atRisk }, { l: 'Critical', c: '#dc2626', v: m.critical }].map(d => (
              <div key={d.l} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2 h-2 rounded-full" style={{ background: d.c }} /> {d.l} ({d.v})
              </div>
            ))}
          </div>
        </div>

        {/* Activity overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Activity (last 14 days)</h3>
            <Link href="/interactions" className="text-xs text-purple-700 hover:underline">View all</Link>
          </div>
          <div className="mb-5">
            <Sparkline data={m.sparkData || []} color="#5a1890" height={48} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>14 days ago</span><span>Today</span>
            </div>
          </div>
          <h4 className="text-xs text-gray-500 mb-3">By channel</h4>
          <BarChart data={activityData} />
        </div>
      </div>

      {/* Recent accounts + quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent accounts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Recent accounts</h3>
            <Link href="/accounts" className="text-xs text-purple-700 hover:underline">View all</Link>
          </div>
          {recentAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2 opacity-40">📋</div>
              <p className="text-sm text-gray-400 mb-3">No accounts yet.</p>
              <Link href="/accounts/new" className="text-xs font-medium" style={{ color: '#5a1890' }}>+ Add your first account</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAccounts.map(a => (
                <Link key={a.id} href={`/accounts/${a.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: a.health_status === 'healthy' ? '#ecfdf5' : a.health_status === 'at_risk' ? '#fffbeb' : '#fef2f2',
                      color: a.health_status === 'healthy' ? '#065f46' : a.health_status === 'at_risk' ? '#92400e' : '#991b1b' }}>
                    {a.health_score_total}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-purple-900 truncate">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.industry || 'No industry'} · {a.last_interaction_at ? `Last contact ${new Date(a.last_interaction_at).toLocaleDateString('en-NG')}` : 'No interactions'}</div>
                  </div>
                  <span className="text-xs text-gray-300 group-hover:text-gray-400">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Quick actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add account', href: '/accounts/new', icon: '＋', desc: 'Track a new client' },
              { label: 'Import CSV', href: '/accounts/import', icon: '📄', desc: 'Bulk import accounts' },
              { label: 'Create sequence', href: '/sequences', icon: '⚡', desc: 'Automate follow-ups' },
              { label: 'View at-risk', href: '/reports/revenue-at-risk', icon: '⚠', desc: 'Accounts needing attention' },
              { label: 'Run playbook', href: '/playbooks', icon: '☰', desc: 'Guided workflows' },
            ].map(action => (
              <Link key={action.label} href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{action.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800 group-hover:text-purple-900">{action.label}</div>
                  <div className="text-[11px] text-gray-400">{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes growUp { from { height: 0; } }
      `}</style>
    </div>
  )
}
