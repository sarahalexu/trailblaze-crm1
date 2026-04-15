// src/app/(dashboard)/reports/revenue-at-risk/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RevenueAtRiskPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
      if (!profile) return

      const { data } = await supabase
        .from('accounts')
        .select('*, assigned_user:users!accounts_assigned_user_id_fkey(full_name)')
        .eq('org_id', profile.org_id)
        .in('health_status', ['at_risk', 'critical'])
        .order('contract_value_annual', { ascending: false, nullsFirst: false })

      setAccounts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function formatNaira(amount?: number): string {
    if (!amount) return '—'
    if (amount >= 1000000) return '₦' + (amount / 1000000).toFixed(1) + 'M'
    return '₦' + amount.toLocaleString()
  }

  const totalAtRisk = accounts.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
  const criticalCount = accounts.filter(a => a.health_status === 'critical').length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Revenue at risk</h1>
        <p className="text-sm text-gray-500 mt-0.5">Accounts with health scores below 15 that need attention.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total revenue at risk</div>
          <div className="text-2xl font-medium text-red-600">{formatNaira(totalAtRisk)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Accounts at risk</div>
          <div className="text-2xl font-medium text-amber-600">{accounts.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Critical accounts</div>
          <div className="text-2xl font-medium text-red-600">{criticalCount}</div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-xl">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-sm font-medium text-green-800">No revenue at risk</h3>
          <p className="text-sm text-green-600">All your accounts are healthy. Keep it up.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Account</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">KEEP</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Last contact</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Renewal</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">Value at risk</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/accounts/${a.id}`}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.assigned_user?.full_name || 'Unassigned'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${a.health_score_total >= 10 ? 'text-amber-700' : 'text-red-700'}`}>{a.health_score_total}/20</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.health_status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {a.health_status === 'at_risk' ? 'At risk' : 'Critical'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                    {a.last_interaction_at ? new Date(a.last_interaction_at).toLocaleDateString('en-NG') : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                    {a.renewal_date ? new Date(a.renewal_date).toLocaleDateString('en-NG') : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-red-700">{formatNaira(a.contract_value_annual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
