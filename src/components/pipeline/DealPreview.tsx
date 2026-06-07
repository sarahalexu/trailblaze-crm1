// src/components/pipeline/DealPreview.tsx
// Slide-out preview for deals in the sales pipeline
// Usage: <DealPreview dealId={selectedDealId} onClose={() => setSelected(null)} onUpdate={() => reload()} />

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DealPreviewProps {
  dealId: string | null
  onClose: () => void
  onUpdate?: () => void
}

export default function DealPreview({ dealId, onClose, onUpdate }: DealPreviewProps) {
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const supabase = createClient()

  useEffect(() => { if (dealId) { load(); setLoading(true); setEditing(false) } }, [dealId])

  async function load() {
    if (!dealId) return
    const { data } = await supabase.from('deals')
      .select('*, contact:contacts(id, full_name, email), account:accounts(id, name), stage:pipeline_stages(name, color), assigned_user:users!deals_assigned_user_id_fkey(full_name)')
      .eq('id', dealId).single()
    setDeal(data)
    if (data) setEditData({ name: data.name, value: data.value || '', probability: data.probability || 0, expected_close_date: data.expected_close_date || '', notes: data.notes || '', status: data.status })
    setLoading(false)
  }

  async function saveDeal() {
    if (!deal) return
    setSaving(true)
    await supabase.from('deals').update({
      name: editData.name, value: editData.value ? parseFloat(editData.value) : null,
      probability: parseInt(editData.probability) || 0,
      expected_close_date: editData.expected_close_date || null,
      notes: editData.notes || null, status: editData.status,
      actual_close_date: (editData.status === 'won' || editData.status === 'lost') ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', deal.id)
    setSaving(false); setEditing(false); load(); onUpdate?.()
  }

  async function deleteDeal() {
    if (!deal || !confirm('Delete this deal? This cannot be undone.')) return
    await supabase.from('deals').delete().eq('id', deal.id)
    onClose(); onUpdate?.()
  }

  function formatNaira(n: number): string {
    if (!n) return '\u2014'
    if (n >= 1000000) return '\u20A6' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '\u20A6' + (n / 1000).toFixed(0) + 'K'
    return '\u20A6' + n.toLocaleString()
  }

  if (!dealId) return null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/10" onClick={onClose} />
      <div className="fixed right-0 top-14 bottom-0 w-96 bg-white border-l border-gray-200 z-40 overflow-y-auto shadow-lg"
        style={{ animation: 'slideInRight 0.15s ease' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>
        ) : deal ? (
          <div>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{deal.name}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">{'\u2715'}</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  deal.status === 'won' ? 'bg-green-100 text-green-800' :
                  deal.status === 'lost' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {deal.status === 'won' ? 'Won' : deal.status === 'lost' ? 'Lost' : 'Open'}
                </span>
                {deal.stage && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: deal.stage.color + '30', color: deal.stage.color }}>
                    {deal.stage.name}
                  </span>
                )}
              </div>
            </div>

            {!editing ? (
              <>
                {/* Deal info */}
                <div className="p-4 border-b border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Value</span><span className="text-gray-900 font-medium text-sm">{formatNaira(deal.value)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Probability</span><span className="text-gray-900">{deal.probability}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Weighted value</span><span className="text-gray-900 font-medium" style={{ color: '#5a1890' }}>{formatNaira(Math.round((deal.value || 0) * (deal.probability / 100)))}</span></div>
                  {deal.expected_close_date && <div className="flex justify-between"><span className="text-gray-500">Expected close</span><span className="text-gray-900">{new Date(deal.expected_close_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                  {deal.actual_close_date && <div className="flex justify-between"><span className="text-gray-500">Closed on</span><span className="text-gray-900">{new Date(deal.actual_close_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                  {deal.assigned_user && <div className="flex justify-between"><span className="text-gray-500">Owner</span><span className="text-gray-900">{deal.assigned_user.full_name}</span></div>}
                </div>

                {/* Contact & Account */}
                <div className="p-4 border-b border-gray-100">
                  {deal.contact && (
                    <Link href={`/contacts/${deal.contact.id}`} className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded -mx-1 px-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                        {deal.contact.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{deal.contact.full_name}</p>
                        <p className="text-[10px] text-gray-400">{deal.contact.email || 'Contact'}</p>
                      </div>
                    </Link>
                  )}
                  {deal.account && (
                    <Link href={`/accounts/${deal.account.id}`} className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded -mx-1 px-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium bg-gray-100 text-gray-600">{'\u{1F3E2}'}</div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{deal.account.name}</p>
                        <p className="text-[10px] text-gray-400">Linked account</p>
                      </div>
                    </Link>
                  )}
                  {!deal.contact && !deal.account && <p className="text-xs text-gray-400">No contact or account linked</p>}
                </div>

                {/* Notes */}
                {deal.notes && (
                  <div className="p-4 border-b border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Notes</div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{deal.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 space-y-2">
                  <button onClick={() => setEditing(true)} className="block w-full py-2 text-center rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Edit deal</button>
                  <button onClick={deleteDeal} className="block w-full py-2 text-center rounded-lg text-sm text-red-500 hover:bg-red-50">Delete deal</button>
                </div>

                <div className="px-4 pb-4">
                  <p className="text-[10px] text-gray-400">Created {new Date(deal.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </>
            ) : (
              /* Edit form */
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Deal name</label>
                  <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Value ({'\u20A6'})</label>
                    <input type="number" value={editData.value} onChange={e => setEditData({ ...editData, value: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Probability (%)</label>
                    <input type="number" min="0" max="100" value={editData.probability} onChange={e => setEditData({ ...editData, probability: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expected close date</label>
                  <input type="date" value={editData.expected_close_date} onChange={e => setEditData({ ...editData, expected_close_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveDeal} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setEditing(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-400">Deal not found</div>
        )}
      </div>
      <style jsx global>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  )
}
