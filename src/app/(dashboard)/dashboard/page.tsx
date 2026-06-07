// src/app/(dashboard)/dashboard/page.tsx
// ENHANCED: Stripe-like visual polish with shadows, skeletons, sparklines, animations
// No donut chart (that's in Reports). KEEP bars + health distribution bar instead.

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SetupChecklist from '@/components/ui/SetupChecklist'
import DashboardTasks from '@/components/ui/DashboardTasks'

// Sparkline with gradient fill
function Sparkline({ data, color = '#5a1890', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const w = 200, h = height
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ')
  const areaPoints = points + ` ${w},${h} 0,${h}`
  const gradId = `sg-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.15" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Bar chart with animation
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-600">{d.value > 0 ? d.value : ''}</span>
          <div className="w-full rounded-t-md" style={{
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
  if (done) return <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl text-center" style={{ animation: 'fadeIn 0.3s ease' }}><p className="text-sm text-green-800 font-medium">{'\u{1F389}'} Demo data loaded!</p></div>
  return (
    <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{'\u{1F9EA}'}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Your dashboard looks empty!</h3>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">Load demo data to see TrailBlaze CRM in action with 8 sample accounts from Nigerian tech companies.</p>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading} className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{loading ? 'Loading...' : 'Load demo data'}</button>
            <Link href="/accounts/new" className="px-4 py-2 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-white">Or add real accounts</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [m, setM] = useState<any>(null)
  const [recentAccounts, setRecentAccounts] = useState<any[]>([])
  const [atRiskAccounts, setAtRiskAccounts] = useState<any[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [keepAvg, setKeepAvg] = useState({ k: 0, e: 0, ex: 0, p: 0 })
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id, full_name').eq('auth_id', user.id).single()
    if (!profile) return
    setUserName(profile.full_name?.split(' ')[0] || '')
    const orgId = profile.org_id

    const { data: accounts } = await supabase.from('accounts').select('*').eq('org_id', orgId)
    const accs = accounts || []

    const healthy = accs.filter(a => a.health_status === 'healthy').length
    const atRisk = accs.filter(a => a.health_status === 'at_risk').length
    const critical = accs.filter(a => a.health_status === 'critical').length
    const totalRevenue = accs.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const revenueAtRisk = accs.filter(a => a.health_status !== 'healthy').reduce((s, a) => s + (a.contract_value_annual || 0), 0)
    const avgHealth = accs.length > 0 ? Math.round((accs.reduce((s, a) => s + (a.health_score_total || 0), 0) / accs.length) * 10) / 10 : 0

    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30)
    const renewals = accs.filter(a => a.renewal_date && new Date(a.renewal_date) <= thirtyDays && new Date(a.renewal_date) >= new Date())

    // KEEP averages
    if (accs.length > 0) {
      setKeepAvg({
        k: Math.round((accs.reduce((s, a) => s + (a.health_score_know || 0), 0) / accs.length) * 10) / 10,
        e: Math.round((accs.reduce((s, a) => s + (a.health_score_engage || 0), 0) / accs.length) * 10) / 10,
        ex: Math.round((accs.reduce((s, a) => s + (a.health_score_exceed || 0), 0) / accs.length) * 10) / 10,
        p: Math.round((accs.reduce((s, a) => s + (a.health_score_prevent || 0), 0) / accs.length) * 10) / 10,
      })
    }

    // Sparkline data
    const { data: interactions } = await supabase.from('interactions').select('created_at').eq('org_id', orgId)
      .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString()).order('created_at')
    const dayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dayMap[d.toISOString().slice(0, 10)] = 0 }
    ;(interactions || []).forEach(i => { const d = i.created_at.slice(0, 10); if (dayMap[d] !== undefined) dayMap[d]++ })
    const sparkData = Object.values(dayMap)

    // Activity by channel
    const { data: channelData } = await supabase.from('interactions').select('channel').eq('org_id', orgId)
    const channels: Record<string, number> = {}
    ;(channelData || []).forEach(i => { channels[i.channel] = (channels[i.channel] || 0) + 1 })
    setActivityData([
      { label: 'Calls', value: channels['call'] || 0, color: '#5a1890' },
      { label: 'Email', value: channels['email'] || 0, color: '#00adef' },
      { label: 'WhatsApp', value: channels['whatsapp'] || 0, color: '#25D366' },
      { label: 'Meeting', value: channels['meeting'] || 0, color: '#c9a54e' },
      { label: 'Other', value: (channels['in_person'] || 0) + (channels['sms'] || 0) + (channels['other'] || 0), color: '#9ca3af' },
    ])

    setRecentAccounts([...accs].sort((a, b) => (b.last_interaction_at || '').localeCompare(a.last_interaction_at || '')).slice(0, 5))
    setAtRiskAccounts(accs.filter(a => a.health_status !== 'healthy').sort((a, b) => (a.health_score_total || 0) - (b.health_score_total || 0)).slice(0, 5))

    setM({ total: accs.length, healthy, atRisk, critical, totalRevenue, revenueAtRisk, avgHealth, renewals: renewals.length, renewalValue: renewals.reduce((s, a) => s + (a.contract_value_annual || 0), 0), sparkData })
    setLoading(false)
  }

  function formatNaira(n: number): string {
    if (n >= 1000000) return '\u20A6' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '\u20A6' + (n / 1000).toFixed(0) + 'K'
    return '\u20A6' + n.toLocaleString()
  }

  const cardShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const totalHealth = (m?.healthy || 0) + (m?.atRisk || 0) + (m?.critical || 0)

  if (loading) return (
    <div className="space-y-4" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="h-8 w-64 tb-skeleton rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 tb-skeleton rounded-xl" />)}</div>
      <div className="grid lg:grid-cols-3 gap-4"><div className="lg:col-span-2 h-72 tb-skeleton rounded-xl" /><div className="h-72 tb-skeleton rounded-xl" /></div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SetupChecklist />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900" style={{ letterSpacing: '-0.02em' }}>{greeting}, {userName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here is how your accounts are doing today.</p>
      </div>

      {m?.total === 0 && <DemoBanner onGenerate={() => load()} />}

      {/* Metric cards with accent bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total accounts', value: m?.total || 0, sub: `${m?.healthy || 0} healthy`, color: '#5a1890', icon: '\u25C6' },
          { label: 'Avg. KEEP score', value: `${m?.avgHealth || 0}/20`, sub: (m?.avgHealth || 0) >= 15 ? 'Strong' : (m?.avgHealth || 0) >= 10 ? 'Needs attention' : 'Critical', color: (m?.avgHealth || 0) >= 15 ? '#1D9E75' : (m?.avgHealth || 0) >= 10 ? '#d97706' : '#dc2626', icon: '\u2665' },
          { label: 'Revenue at risk', value: formatNaira(m?.revenueAtRisk || 0), sub: `${(m?.atRisk || 0) + (m?.critical || 0)} accounts`, color: '#dc2626', icon: '\u26A0' },
          { label: 'Renewals (30d)', value: m?.renewals || 0, sub: formatNaira(m?.renewalValue || 0), color: '#c9a54e', icon: '\u21BB' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden" style={{ boxShadow: cardShadow, animation: `slideUp 0.3s ease ${i * 0.05}s both` }}>
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: card.color }} />
            <div className="pl-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{card.label}</span>
                <span className="text-xs opacity-40" style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: '-0.03em' }}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Portfolio health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: cardShadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Portfolio health</h3>
            <Link href="/reports" className="text-xs hover:underline" style={{ color: '#5a1890' }}>Full report</Link>
          </div>

          {/* Health distribution bar */}
          {(m?.total || 0) > 0 && (
            <div className="mb-4">
              <div className="flex h-3 rounded-full overflow-hidden mb-2.5" style={{ animation: 'fadeIn 0.5s ease' }}>
                <div className="transition-all duration-700" style={{ width: `${((m?.healthy || 0) / m.total) * 100}%`, background: '#1D9E75' }} />
                <div className="transition-all duration-700" style={{ width: `${((m?.atRisk || 0) / m.total) * 100}%`, background: '#d97706' }} />
                <div className="transition-all duration-700" style={{ width: `${((m?.critical || 0) / m.total) * 100}%`, background: '#dc2626' }} />
              </div>
              <div className="flex gap-4">
                {[{ l: 'Healthy', c: '#1D9E75', v: m?.healthy || 0 }, { l: 'At risk', c: '#d97706', v: m?.atRisk || 0 }, { l: 'Critical', c: '#dc2626', v: m?.critical || 0 }].map(d => (
                  <div key={d.l} className="flex items-center gap-1.5 text-xs text-gray-600"><div className="w-2 h-2 rounded-full" style={{ background: d.c }} />{d.l} ({d.v})</div>
                ))}
              </div>
            </div>
          )}

          {/* KEEP dimension bars */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">KEEP averages</span>
              <span className="text-sm font-semibold" style={{ color: (m?.avgHealth || 0) >= 15 ? '#1D9E75' : (m?.avgHealth || 0) >= 10 ? '#d97706' : '#dc2626' }}>{m?.avgHealth || 0}<span className="text-xs text-gray-400 font-normal">/20</span></span>
            </div>
            {[{ name: 'Know', score: keepAvg.k, color: '#5a1890' }, { name: 'Engage', score: keepAvg.e, color: '#00adef' }, { name: 'Exceed', score: keepAvg.ex, color: '#c9a54e' }, { name: 'Prevent', score: keepAvg.p, color: '#1D9E75' }].map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-14">{d.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.score / 5) * 100}%`, background: d.color }} /></div>
                <span className="text-xs font-semibold w-6 text-right" style={{ color: d.color }}>{d.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity sparkline + bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: cardShadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Activity (last 14 days)</h3>
            <Link href="/interactions" className="text-xs hover:underline" style={{ color: '#5a1890' }}>View inbox</Link>
          </div>
          <div className="mb-5">
            <Sparkline data={m?.sparkData || []} color="#5a1890" height={48} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>14 days ago</span><span>Today</span></div>
          </div>
          <h4 className="text-xs text-gray-500 mb-3">By channel</h4>
          <BarChart data={activityData} />
        </div>
      </div>

      {/* Bottom row: accounts + tasks + at-risk */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent accounts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: cardShadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Recent accounts</h3>
            <Link href="/accounts" className="text-xs hover:underline" style={{ color: '#5a1890' }}>View all</Link>
          </div>
          {recentAccounts.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm text-gray-400">No accounts yet.</p></div>
          ) : recentAccounts.map(a => (
            <Link key={a.id} href={`/accounts/${a.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ background: a.health_status === 'healthy' ? '#ecfdf5' : a.health_status === 'at_risk' ? '#fffbeb' : '#fef2f2', color: a.health_status === 'healthy' ? '#065f46' : a.health_status === 'at_risk' ? '#92400e' : '#991b1b' }}>
                {a.health_score_total}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 group-hover:text-purple-900 truncate">{a.name}</div>
                <div className="text-xs text-gray-400">{a.industry || 'No industry'} {'\u00B7'} {formatNaira(a.contract_value_annual || 0)}</div>
              </div>
              <span className="text-xs text-gray-300 group-hover:text-gray-400">{'\u2192'}</span>
            </Link>
          ))}
        </div>

        {/* Right column: tasks + at-risk */}
        <div className="space-y-4">
          <DashboardTasks />

          {atRiskAccounts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: cardShadow }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-red-500">{'\u26A0'}</span>
                <h3 className="text-sm font-medium text-gray-900">Needs attention</h3>
              </div>
              {atRiskAccounts.map(a => (
                <Link key={a.id} href={`/accounts/${a.id}`} className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded -mx-1 px-1 transition-colors">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.health_status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <span className="text-sm text-gray-900 flex-1 truncate">{a.name}</span>
                  <span className={`text-xs font-medium ${(a.health_score_total || 0) < 8 ? 'text-red-600' : 'text-amber-600'}`}>{a.health_score_total}/20</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes growUp { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); transform-origin: bottom; } }
        .tb-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: skeleton 1.5s infinite; border-radius: 8px; }
        @keyframes skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  )
}
