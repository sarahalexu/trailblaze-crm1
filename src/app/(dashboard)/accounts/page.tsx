// src/app/(dashboard)/accounts/page.tsx
// REDESIGNED: Cleaner layout, mini KEEP bars, account initials, better empty state

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'value'>('name')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadAccounts() }, [])

  async function loadAccounts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data } = await supabase
      .from('accounts')
      .select('*, assigned_user:users!accounts_assigned_user_id_fkey(id, full_name)')
      .eq('org_id', profile.org_id)
      .order('name')

    setAccounts(data || [])
    setLoading(false)
  }

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.industry || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'health') return (a.health_score_total || 0) - (b.health_score_total || 0)
    if (sortBy === 'value') return (b.contract_value_annual || 0) - (a.contract_value_annual || 0)
    return a.name.localeCompare(b.name)
  })

  function formatNaira(amount?: number): string {
    if (!amount) return '\u2014'
    if (amount >= 1000000) return '\u20A6' + (amount / 1000000).toFixed(1) + 'M'
    if (amount >= 1000) return '\u20A6' + (amount / 1000).toFixed(0) + 'K'
    return '\u20A6' + amount.toLocaleString()
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    healthy: { bg: 'bg-green-50', text: 'text-green-700', label: 'Healthy' },
    at_risk: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'At risk' },
    critical: { bg: 'bg-red-50', text: 'text-red-700', label: 'Critical' },
  }

  const totalRevenue = accounts.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
  const healthyCount = accounts.filter(a => a.health_status === 'healthy').length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            {accounts.length > 0 && ` \u00B7 ${formatNaira(totalRevenue)} total \u00B7 ${healthyCount} healthy`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings/import" className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">Import CSV</Link>
          <Link href="/accounts/new" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ New account</Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
          className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          {([
            { key: 'name' as const, label: 'A-Z' },
            { key: 'health' as const, label: 'Health' },
            { key: 'value' as const, label: 'Value' },
          ]).map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)} className={`px-2.5 py-1 rounded-md font-medium ${sortBy === s.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">{'\u{1F3E2}'}</p>
          <p className="text-sm font-medium text-gray-900 mb-1">{search ? 'No matching accounts' : 'No accounts yet'}</p>
          <p className="text-xs text-gray-400 mb-4">{search ? 'Try a different search term.' : 'Add your first account to start tracking client relationships.'}</p>
          {!search && <Link href="/accounts/new" className="px-4 py-2 rounded-lg text-sm font-medium inline-block" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Add first account</Link>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Account</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">KEEP score</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Contract</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Manager</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(account => {
                const status = statusColors[account.health_status] || statusColors.critical
                const initials = account.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <tr key={account.id} onClick={() => router.push(`/accounts/${account.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: '#2b054810', color: '#5a1890' }}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{account.name}</p>
                          {account.industry && <p className="text-xs text-gray-400">{account.industry}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${(account.health_score_total || 0) >= 15 ? 'text-green-700' : (account.health_score_total || 0) >= 10 ? 'text-amber-700' : 'text-red-700'}`}>
                          {account.health_score_total || 0}
                        </span>
                        <div className="flex gap-0.5">
                          {[
                            { s: account.health_score_know, c: '#5a1890' },
                            { s: account.health_score_engage, c: '#00adef' },
                            { s: account.health_score_exceed, c: '#c9a54e' },
                            { s: account.health_score_prevent, c: '#1D9E75' },
                          ].map((d, i) => (
                            <div key={i} className="w-5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(d.s || 0) * 20}%`, background: d.c }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>{status.label}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden lg:table-cell">{formatNaira(account.contract_value_annual)}</td>
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{account.assigned_user?.full_name || '\u2014'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
