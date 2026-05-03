// src/components/ui/PipelineTableView.tsx
// Spreadsheet-style view for pipelines — toggleable with Kanban view
'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Account {
  id: string; name: string; industry?: string; health_score_total: number; health_status: string
  contract_value_annual?: number; renewal_date?: string; last_interaction_at?: string
  assigned_user?: { full_name: string }; stage?: { name: string; color: string }; notes?: string
}

interface Deal {
  id: string; name: string; value?: number; probability: number; status: string
  expected_close_date?: string; contact?: { full_name: string }; stage?: { name: string; color: string }; notes?: string
}

type SortKey = string
type SortDir = 'asc' | 'desc'

export function AccountTableView({ accounts }: { accounts: Account[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('health_score_total')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || (a.industry || '').toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a: any, b: any) => {
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const fmtN = (n?: number) => !n ? '—' : n >= 1000000 ? '₦' + (n / 1000000).toFixed(1) + 'M' : '₦' + n.toLocaleString()

  const cols = [
    { key: 'name', label: 'Account' },
    { key: 'stage', label: 'Stage' },
    { key: 'health_score_total', label: 'KEEP' },
    { key: 'health_status', label: 'Status' },
    { key: 'industry', label: 'Industry' },
    { key: 'contract_value_annual', label: 'Value' },
    { key: 'renewal_date', label: 'Renewal' },
    { key: 'last_interaction_at', label: 'Last contact' },
  ]

  return (
    <div>
      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {cols.map(c => (
                <th key={c.key} onClick={() => toggleSort(c.key)}
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                  {c.label} {sortKey === c.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(a => (
              <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => window.location.href = `/accounts/${a.id}`}>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{a.name}</div>
                  {a.assigned_user && <div className="text-[11px] text-gray-400">{a.assigned_user.full_name}</div>}
                </td>
                <td className="py-3 px-4">
                  {a.stage && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: a.stage.color + '25', color: a.stage.color }}>{a.stage.name}</span>}
                </td>
                <td className="py-3 px-4">
                  <span className={`font-semibold ${a.health_score_total >= 15 ? 'text-green-700' : a.health_score_total >= 10 ? 'text-amber-700' : 'text-red-700'}`}>
                    {a.health_score_total}/20
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${a.health_status === 'healthy' ? 'bg-green-100 text-green-800' : a.health_status === 'at_risk' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                    {a.health_status === 'at_risk' ? 'At risk' : a.health_status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{a.industry || '—'}</td>
                <td className="py-3 px-4 text-gray-700 font-medium">{fmtN(a.contract_value_annual)}</td>
                <td className="py-3 px-4 text-gray-600">{a.renewal_date ? new Date(a.renewal_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}</td>
                <td className="py-3 px-4 text-gray-600">{a.last_interaction_at ? new Date(a.last_interaction_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="text-center py-8 text-sm text-gray-400">{search ? 'No matching accounts' : 'No accounts'}</div>}
      </div>
    </div>
  )
}

export function DealTableView({ deals }: { deals: Deal[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...deals].sort((a: any, b: any) => {
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
    if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const fmtN = (n?: number) => !n ? '—' : n >= 1000000 ? '₦' + (n / 1000000).toFixed(1) + 'M' : '₦' + n.toLocaleString()

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {[{k:'name',l:'Deal'},{k:'stage',l:'Stage'},{k:'value',l:'Value'},{k:'probability',l:'Probability'},{k:'contact',l:'Contact'},{k:'expected_close_date',l:'Close date'},{k:'notes',l:'Notes'}].map(c => (
              <th key={c.k} onClick={() => toggleSort(c.k)} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                {c.l} {sortKey === c.k && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(d => (
            <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 font-medium text-gray-900">{d.name}</td>
              <td className="py-3 px-4">
                {d.stage && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: d.stage.color + '25', color: d.stage.color }}>{d.stage.name}</span>}
              </td>
              <td className="py-3 px-4 text-gray-700 font-medium">{fmtN(d.value)}</td>
              <td className="py-3 px-4"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{d.probability}%</span></td>
              <td className="py-3 px-4 text-gray-600">{d.contact?.full_name || '—'}</td>
              <td className="py-3 px-4 text-gray-600">{d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}</td>
              <td className="py-3 px-4 text-gray-500 text-xs max-w-[200px] truncate">{d.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No deals</div>}
    </div>
  )
}

// The toggle button to switch between views
export function ViewToggle({ view, onToggle }: { view: 'kanban' | 'table'; onToggle: (v: 'kanban' | 'table') => void }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      <button onClick={() => onToggle('kanban')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
        Board
      </button>
      <button onClick={() => onToggle('table')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
        Table
      </button>
    </div>
  )
}
