// src/app/(dashboard)/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'


export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadReports() }, [])

  async function loadReports() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const orgId = profile.org_id

    const [accountsRes, interactionsRes, usersRes, dealsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('org_id', orgId),
      supabase.from('interactions').select('user_id, channel, created_at, follow_up_required, follow_up_date').eq('org_id', orgId),
      supabase.from('users').select('id, full_name, role').eq('org_id', orgId).eq('is_active', true),
      supabase.from('deals').select('value, status').eq('org_id', orgId),
    ])

    const accounts = accountsRes.data || []
    const interactions = interactionsRes.data || []
    const users = usersRes.data || []
    const deals = dealsRes.data || []

    // Health distribution
    const healthy = accounts.filter(a => a.health_status === 'healthy')
    const atRisk = accounts.filter(a => a.health_status === 'at_risk')
    const critical = accounts.filter(a => a.health_status === 'critical')

    // Revenue at risk
    const revenueAtRisk = [...atRisk, ...critical].reduce((sum, a) => sum + (a.contract_value_annual || 0), 0)
    const totalRevenue = accounts.reduce((sum, a) => sum + (a.contract_value_annual || 0), 0)

    // Upcoming renewals
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const renewals30 = accounts.filter(a => a.renewal_date && new Date(a.renewal_date) <= thirtyDays && new Date(a.renewal_date) >= now)
    const renewals60 = accounts.filter(a => a.renewal_date && new Date(a.renewal_date) <= sixtyDays && new Date(a.renewal_date) > thirtyDays)
    const renewals90 = accounts.filter(a => a.renewal_date && new Date(a.renewal_date) <= ninetyDays && new Date(a.renewal_date) > sixtyDays)

    // Activity this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthInteractions = interactions.filter(i => new Date(i.created_at) >= monthStart)

    // Channel breakdown
    const channelCounts: Record<string, number> = {}
    for (const i of thisMonthInteractions) {
      channelCounts[i.channel] = (channelCounts[i.channel] || 0) + 1
    }

    // Overdue follow-ups
    const overdue = interactions.filter(i =>
      i.follow_up_required && i.follow_up_date && new Date(i.follow_up_date) < now
    )

    // Per-user activity
    const userActivity = users.filter(u => u.role !== 'viewer').map(u => {
      const userInteractions = thisMonthInteractions.filter(i => i.user_id === u.id)
      const assignedAccounts = accounts.filter(a => a.assigned_user_id === u.id)
      return {
        name: u.full_name,
        interactions: userInteractions.length,
        accounts: assignedAccounts.length,
        avgHealth: assignedAccounts.length > 0
          ? Math.round(assignedAccounts.reduce((s, a) => s + a.health_score_total, 0) / assignedAccounts.length * 10) / 10
          : 0,
      }
    })

    // Deal metrics
    const wonDeals = deals.filter(d => d.status === 'won')
    const wonValue = wonDeals.reduce((s, d) => s + (d.value || 0), 0)

    setData({
      accounts, healthy, atRisk, critical,
      revenueAtRisk, totalRevenue,
      renewals30, renewals60, renewals90,
      thisMonthInteractions, channelCounts, overdue,
      userActivity, wonValue, wonDeals,
    })
    setLoading(false)
  }

  function formatNaira(amount: number): string {
    if (amount >= 1000000) return '₦' + (amount / 1000000).toFixed(1) + 'M'
    if (amount >= 1000) return '₦' + (amount / 1000).toFixed(0) + 'K'
    return '₦' + amount.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) return null

  const healthPct = (count: number) => data.accounts.length > 0
    ? Math.round((count / data.accounts.length) * 100) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Account health, revenue risk, and team activity at a glance.</p>
      </div>

      {/* Report 1: Account Health Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Account health distribution</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg" style={{ background: '#EAF3DE' }}>
            <div className="text-2xl font-medium" style={{ color: '#3B6D11' }}>{data.healthy.length}</div>
            <div className="text-xs" style={{ color: '#3B6D11' }}>Healthy ({healthPct(data.healthy.length)}%)</div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: '#FAEEDA' }}>
            <div className="text-2xl font-medium" style={{ color: '#854F0B' }}>{data.atRisk.length}</div>
            <div className="text-xs" style={{ color: '#854F0B' }}>At risk ({healthPct(data.atRisk.length)}%)</div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: '#FCEBEB' }}>
            <div className="text-2xl font-medium" style={{ color: '#A32D2D' }}>{data.critical.length}</div>
            <div className="text-xs" style={{ color: '#A32D2D' }}>Critical ({healthPct(data.critical.length)}%)</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium text-gray-900">Account Health Report</h3>
      <p className="text-xs text-gray-500 mt-0.5">Download a comprehensive PDF report of all accounts, health scores, revenue at risk, and activity.</p>
    </div>
    <a href="/api/reports/pdf" target="_blank"
      className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
      style={{ background: '#2b0548', color: '#e1b3ee' }}>
      Download Report
    </a>
  </div>
</div>

        {/* Visual bar */}
        <div className="h-3 rounded-full overflow-hidden flex">
          <div style={{ width: `${healthPct(data.healthy.length)}%`, background: '#97C459' }}></div>
          <div style={{ width: `${healthPct(data.atRisk.length)}%`, background: '#FAC775' }}></div>
          <div style={{ width: `${healthPct(data.critical.length)}%`, background: '#F09595' }}></div>
        </div>
      </div>

      {/* Report 2: Revenue at Risk */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Revenue at risk</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Total portfolio</div>
            <div className="text-xl font-medium text-gray-900">{formatNaira(data.totalRevenue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Revenue at risk</div>
            <div className="text-xl font-medium text-red-600">{formatNaira(data.revenueAtRisk)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">At-risk %</div>
            <div className="text-xl font-medium text-amber-600">
              {data.totalRevenue > 0 ? Math.round((data.revenueAtRisk / data.totalRevenue) * 100) : 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Deals won (total)</div>
            <div className="text-xl font-medium" style={{ color: '#1D9E75' }}>{formatNaira(data.wonValue)}</div>
          </div>
        </div>

        {/* At-risk accounts table */}
        {[...data.critical, ...data.atRisk].length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Accounts needing attention</div>
            <div className="space-y-2">
              {[...data.critical, ...data.atRisk]
                .sort((a: any, b: any) => (b.contract_value_annual || 0) - (a.contract_value_annual || 0))
                .slice(0, 10)
                .map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${a.health_status === 'critical' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
                      <span className="font-medium text-gray-900">{a.name}</span>
                      <span className="text-xs text-gray-400">{a.health_score_total}/20</span>
                    </div>
                    <span className="text-gray-700">{formatNaira(a.contract_value_annual || 0)}/yr</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Report 3: Renewals */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Upcoming renewals</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-medium text-red-700">{data.renewals30.length}</div>
            <div className="text-xs text-red-600">Within 30 days</div>
            <div className="text-xs text-red-500 mt-1">
              {formatNaira(data.renewals30.reduce((s: number, a: any) => s + (a.contract_value_annual || 0), 0))}
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="text-lg font-medium text-amber-700">{data.renewals60.length}</div>
            <div className="text-xs text-amber-600">31-60 days</div>
            <div className="text-xs text-amber-500 mt-1">
              {formatNaira(data.renewals60.reduce((s: number, a: any) => s + (a.contract_value_annual || 0), 0))}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-medium text-gray-700">{data.renewals90.length}</div>
            <div className="text-xs text-gray-600">61-90 days</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNaira(data.renewals90.reduce((s: number, a: any) => s + (a.contract_value_annual || 0), 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Report 4: Activity Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Activity this month</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Total interactions</div>
            <div className="text-xl font-medium text-gray-900">{data.thisMonthInteractions.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Overdue follow-ups</div>
            <div className={`text-xl font-medium ${data.overdue.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.overdue.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Top channel</div>
            <div className="text-xl font-medium text-gray-900 capitalize">
              {Object.entries(data.channelCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'None'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">WhatsApp messages</div>
            <div className="text-xl font-medium" style={{ color: '#1D9E75' }}>
              {data.channelCounts.whatsapp || 0}
            </div>
          </div>
        </div>

        {/* Channel breakdown */}
        {Object.keys(data.channelCounts).length > 0 && (
          <div className="border-t border-gray-100 pt-4 mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">By channel</div>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(data.channelCounts)
                .sort((a: any, b: any) => b[1] - a[1])
                .map(([channel, count]: any) => (
                  <div key={channel} className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                    <span className="capitalize text-gray-700">{channel}</span>
                    <span className="ml-2 font-medium text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Per-user activity */}
        {data.userActivity.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Team performance</div>
            <div className="space-y-2">
              {data.userActivity.map((u: any) => (
                <div key={u.name} className="flex items-center justify-between text-sm py-1.5">
                  <span className="font-medium text-gray-900">{u.name}</span>
                  <div className="flex gap-6 text-xs text-gray-500">
                    <span>{u.interactions} interactions</span>
                    <span>{u.accounts} accounts</span>
                    <span>Avg health: {u.avgHealth}/20</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
