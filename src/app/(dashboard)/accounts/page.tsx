// src/app/(dashboard)/accounts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/lib/types'
import Link from 'next/link'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

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
  )

  function formatNaira(amount?: number): string {
    if (!amount) return '—'
    if (amount >= 1000000) return '₦' + (amount / 1000000).toFixed(1) + 'M'
    return '₦' + amount.toLocaleString()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/accounts/import" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">📄 Import CSV</Link>
          <Link href="/accounts/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ New account</Link>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-sm font-medium text-gray-900 mb-1">{search ? 'No matching accounts' : 'No accounts yet'}</h3>
          <p className="text-sm text-gray-500 mb-4">{search ? 'Try a different search term.' : 'Add your first account to start tracking relationships.'}</p>
          {!search && <Link href="/accounts/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Add account</Link>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Account</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Industry</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">KEEP</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Value</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Manager</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(account => (
                <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/accounts/${account.id}`}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{account.name}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{account.industry || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${account.health_score_total >= 15 ? 'text-green-700' : account.health_score_total >= 10 ? 'text-amber-700' : 'text-red-700'}`}>
                      {account.health_score_total}/20
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      account.health_status === 'healthy' ? 'bg-green-100 text-green-800' :
                      account.health_status === 'at_risk' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>{account.health_status === 'at_risk' ? 'At risk' : account.health_status}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-700 hidden lg:table-cell">{formatNaira(account.contract_value_annual)}</td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{account.assigned_user?.full_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
