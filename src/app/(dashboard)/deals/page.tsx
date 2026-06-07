// src/app/(dashboard)/deals/page.tsx
// All deals across all pipelines with search, filters, create new deal

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DealRow {
  id: string; name: string; value: number | null; probability: number
  status: string; expected_close_date: string | null; created_at: string
  pipeline: { name: string } | null; stage: { name: string; color: string } | null
  contact: { id: string; full_name: string } | null; account: { id: string; name: string } | null
  assigned_user: { full_name: string } | null
}

type FilterStatus = 'all' | 'open' | 'won' | 'lost'

export default function DealsPage() {
  const [deals, setDeals] = useState<DealRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [newDeal, setNewDeal] = useState({ name: '', value: '', probability: '20', pipelineId: '', contactId: '', closeDate: '', notes: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data } = await supabase.from('deals')
      .select('*, pipeline:pipelines(name), stage:pipeline_stages(name, color), contact:contacts(id, full_name), account:accounts(id, name), assigned_user:users!deals_assigned_user_id_fkey(full_name)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
    setDeals(data || [])

    const { data: pips } = await supabase.from('pipelines').select('id, name, pipeline_type').eq('org_id', profile.org_id).in('pipeline_type', ['sales', 'investor_relations', 'donor_management', 'custom']).order('name')
    setPipelines(pips || [])

    const { data: ctcts } = await supabase.from('contacts').select('id, full_name').eq('org_id', profile.org_id).order('full_name')
    setContacts(ctcts || [])

    setLoading(false)
  }

  async function createDeal() {
    if (!newDeal.name.trim() || !newDeal.pipelineId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: firstStage } = await supabase.from('pipeline_stages').select('id').eq('pipeline_id', newDeal.pipelineId).order('sort_order').limit(1).single()

    try {
      const { data: created } = await supabase.from('deals').insert({
        org_id: profile.org_id, name: newDeal.name.trim(),
        value: newDeal.value ? parseFloat(newDeal.value) : null,
        probability: parseInt(newDeal.probability) || 20,
        pipeline_id: newDeal.pipelineId, stage_id: firstStage?.id || null,
        contact_id: newDeal.contactId || null, assigned_user_id: profile.id,
        expected_close_date: newDeal.closeDate || null, notes: newDeal.notes.trim() || null, status: 'open',
      }).select('id').single()

      setShowCreate(false)
      setNewDeal({ name: '', value: '', probability: '20', pipelineId: '', contactId: '', closeDate: '', notes: '' })
      if (created) router.push(`/deals/${created.id}`)
      else await load()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  function formatNaira(n: number | null): string {
    if (!n) return '\u2014'
    if (n >= 1000000) return '\u20A6' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '\u20A6' + (n / 1000).toFixed(0) + 'K'
    return '\u20A6' + n.toLocaleString()
  }

  const filtered = deals
    .filter(d => statusFilter === 'all' || d.status === statusFilter)
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || (d.contact?.full_name || '').toLowerCase().includes(search.toLowerCase()) || (d.account?.name || '').toLowerCase().includes(search.toLowerCase()))

  const totalOpen = deals.filter(d => d.status === 'open').reduce((s, d) => s + (d.value || 0), 0)
  const totalWon = deals.filter(d => d.status === 'won').reduce((s, d) => s + (d.value || 0), 0)
  const wonCount = deals.filter(d => d.status === 'won').length
  const openCount = deals.filter(d => d.status === 'open').length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{openCount} open ({formatNaira(totalOpen)}) {'\u00B7'} {wonCount} won ({formatNaira(totalWon)})</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ New deal</button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">New deal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Deal name *</label><input type="text" value={newDeal.name} onChange={e => setNewDeal({ ...newDeal, name: e.target.value })} placeholder="e.g. Q3 Renewal" autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Pipeline *</label><select value={newDeal.pipelineId} onChange={e => setNewDeal({ ...newDeal, pipelineId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">Select pipeline</option>{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Value ({'\u20A6'})</label><input type="number" value={newDeal.value} onChange={e => setNewDeal({ ...newDeal, value: e.target.value })} placeholder="1000000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Probability (%)</label><input type="number" min="0" max="100" value={newDeal.probability} onChange={e => setNewDeal({ ...newDeal, probability: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Contact</label><select value={newDeal.contactId} onChange={e => setNewDeal({ ...newDeal, contactId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">Select contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Expected close</label><input type="date" value={newDeal.closeDate} onChange={e => setNewDeal({ ...newDeal, closeDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div className="mt-3"><label className="block text-xs text-gray-500 mb-1">Notes</label><textarea value={newDeal.notes} onChange={e => setNewDeal({ ...newDeal, notes: e.target.value })} rows={2} placeholder="Deal context..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div className="flex gap-2 mt-4">
            <button onClick={createDeal} disabled={saving || !newDeal.name.trim() || !newDeal.pipelineId} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Creating...' : 'Create deal'}</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..."
          className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          {(['all', 'open', 'won', 'lost'] as FilterStatus[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-md font-medium capitalize ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{s}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">{'\u{1F4B0}'}</p>
          <p className="text-sm font-medium text-gray-900 mb-1">{search || statusFilter !== 'all' ? 'No matching deals' : 'No deals yet'}</p>
          <p className="text-xs text-gray-400 mb-4">{!search && statusFilter === 'all' ? 'Create your first deal to start tracking your sales pipeline.' : ''}</p>
          {!search && statusFilter === 'all' && <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Create first deal</button>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Deal</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Value</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Stage</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Contact</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Close date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Prob.</th>
            </tr></thead>
            <tbody>
              {filtered.map(deal => (
                <tr key={deal.id} onClick={() => router.push(`/deals/${deal.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${deal.status === 'won' ? 'bg-green-500' : deal.status === 'lost' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-medium text-gray-900">{deal.name}</p>
                        <p className="text-xs text-gray-400">{deal.pipeline?.name || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{formatNaira(deal.value)}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    {deal.stage && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: deal.stage.color + '25', color: deal.stage.color }}>{deal.stage.name}</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{deal.contact?.full_name || '\u2014'}</td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '\u2014'}</td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">{deal.probability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
