// src/app/(dashboard)/deals/[id]/page.tsx
// Full deal detail page with edit, status management, linked entities

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import EmailComposer from '@/components/email/EmailComposer'

export default function DealDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [contacts, setContacts] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('deals')
      .select('*, pipeline:pipelines(id, name, pipeline_type), stage:pipeline_stages(id, name, color), contact:contacts(id, full_name, email, phone_number, job_title), account:accounts(id, name, industry, health_score_total, health_status), assigned_user:users!deals_assigned_user_id_fkey(id, full_name)')
      .eq('id', id).single()

    if (!data) { setLoading(false); return }
    setDeal(data)
    setEditData({
      name: data.name, value: data.value || '', probability: data.probability || 0,
      expected_close_date: data.expected_close_date || '', notes: data.notes || '',
      status: data.status, contact_id: data.contact?.id || '', account_id: data.account?.id || '',
      stage_id: data.stage?.id || '', loss_reason: data.loss_reason || '',
    })

    // Load pipeline stages for stage selector
    if (data.pipeline?.id) {
      const { data: stageData } = await supabase.from('pipeline_stages').select('id, name, color, sort_order').eq('pipeline_id', data.pipeline.id).order('sort_order')
      setStages(stageData || [])
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
      if (profile) {
        const { data: ctcts } = await supabase.from('contacts').select('id, full_name').eq('org_id', profile.org_id).order('full_name')
        setContacts(ctcts || [])
        const { data: accts } = await supabase.from('accounts').select('id, name').eq('org_id', profile.org_id).order('name')
        setAccounts(accts || [])
      }
    }

    setLoading(false)
  }

  async function saveDeal() {
    if (!deal) return
    setSaving(true)

    const updateData: any = {
      name: editData.name, value: editData.value ? parseFloat(editData.value) : null,
      probability: parseInt(editData.probability) || 0,
      expected_close_date: editData.expected_close_date || null,
      notes: editData.notes || null, status: editData.status,
      contact_id: editData.contact_id || null, account_id: editData.account_id || null,
      stage_id: editData.stage_id || deal.stage?.id || null,
      loss_reason: editData.status === 'lost' ? editData.loss_reason || null : null,
    }

    if ((editData.status === 'won' || editData.status === 'lost') && !deal.actual_close_date) {
      updateData.actual_close_date = new Date().toISOString().split('T')[0]
    }

    await supabase.from('deals').update(updateData).eq('id', deal.id)
    setSaving(false); setEditing(false); load()
  }

  async function deleteDeal() {
    if (!confirm('Delete this deal? This cannot be undone.')) return
    await supabase.from('deals').delete().eq('id', id)
    router.push('/deals')
  }

  function formatNaira(n: number | null): string {
    if (!n) return '\u2014'
    if (n >= 1000000) return '\u20A6' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '\u20A6' + (n / 1000).toFixed(0) + 'K'
    return '\u20A6' + n.toLocaleString()
  }

  function formatDate(d: string | null): string {
    if (!d) return '\u2014'
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>
  if (!deal) return <div className="text-center py-16 text-gray-500">Deal not found.</div>

  const weighted = Math.round((deal.value || 0) * (deal.probability / 100))

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/deals" className="hover:text-gray-600">Deals</Link>
        <span>/</span>
        <span className="text-gray-700">{deal.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Deal info */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-6">
            {!editing ? (
              <>
                <div className="mb-4">
                  <h1 className="text-lg font-semibold text-gray-900 mb-2">{deal.name}</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${deal.status === 'won' ? 'bg-green-100 text-green-800' : deal.status === 'lost' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {deal.status === 'won' ? 'Won' : deal.status === 'lost' ? 'Lost' : 'Open'}
                    </span>
                    {deal.stage && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: deal.stage.color + '25', color: deal.stage.color }}>{deal.stage.name}</span>}
                    {deal.pipeline && <span className="text-xs text-gray-400">{deal.pipeline.name}</span>}
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between"><span className="text-gray-500">Value</span><span className="text-lg font-semibold text-gray-900">{formatNaira(deal.value)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Probability</span><span className="text-gray-900">{deal.probability}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Weighted</span><span className="font-medium" style={{ color: '#5a1890' }}>{formatNaira(weighted)}</span></div>
                  <div className="border-t border-gray-100 pt-3" />
                  <div className="flex justify-between"><span className="text-gray-500">Expected close</span><span className="text-gray-900">{formatDate(deal.expected_close_date)}</span></div>
                  {deal.actual_close_date && <div className="flex justify-between"><span className="text-gray-500">Closed on</span><span className="text-gray-900">{formatDate(deal.actual_close_date)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-900">{formatDate(deal.created_at)}</span></div>
                  {deal.assigned_user && <div className="flex justify-between"><span className="text-gray-500">Owner</span><span className="text-gray-900">{deal.assigned_user.full_name}</span></div>}
                  {deal.loss_reason && <div className="flex justify-between"><span className="text-gray-500">Loss reason</span><span className="text-gray-900">{deal.loss_reason}</span></div>}
                </div>

                {/* Stage progress */}
                {stages.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs text-gray-500 mb-2">Pipeline stage</p>
                    <div className="flex gap-1">
                      {stages.map((s, i) => {
                        const isActive = s.id === deal.stage?.id
                        const isPast = stages.findIndex((st: any) => st.id === deal.stage?.id) > i
                        return (
                          <div key={s.id} className="flex-1 h-2 rounded-full" style={{ background: isActive || isPast ? s.color : '#e5e7eb' }} title={s.name} />
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{stages[0]?.name}</span>
                      <span className="text-[10px] text-gray-400">{stages[stages.length - 1]?.name}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <button onClick={() => setEditing(true)} className="w-full py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Edit deal</button>
                  {deal.contact?.email && <button onClick={() => setShowComposer(true)} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Email {deal.contact.full_name}</button>}
                  <button onClick={deleteDeal} className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">Delete deal</button>
                </div>
              </>
            ) : (
              /* Edit form */
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Edit deal</h3>
                <div><label className="block text-xs text-gray-500 mb-1">Name</label><input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-gray-500 mb-1">Value ({'\u20A6'})</label><input type="number" value={editData.value} onChange={e => setEditData({ ...editData, value: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Probability</label><input type="number" min="0" max="100" value={editData.probability} onChange={e => setEditData({ ...editData, probability: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Stage</label><select value={editData.stage_id} onChange={e => setEditData({ ...editData, stage_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">Select stage</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Status</label><select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option></select></div>
                {editData.status === 'lost' && <div><label className="block text-xs text-gray-500 mb-1">Loss reason</label><input type="text" value={editData.loss_reason} onChange={e => setEditData({ ...editData, loss_reason: e.target.value })} placeholder="Why was it lost?" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>}
                <div><label className="block text-xs text-gray-500 mb-1">Contact</label><select value={editData.contact_id} onChange={e => setEditData({ ...editData, contact_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">No contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Account</label><select value={editData.account_id} onChange={e => setEditData({ ...editData, account_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">No account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Expected close</label><input type="date" value={editData.expected_close_date} onChange={e => setEditData({ ...editData, expected_close_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Notes</label><textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveDeal} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setEditing(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Linked entities and notes */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact card */}
          {deal.contact && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Contact</h3>
              <Link href={`/contacts/${deal.contact.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                  {deal.contact.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{deal.contact.full_name}</p>
                  <p className="text-xs text-gray-400">{deal.contact.job_title || deal.contact.email || ''}</p>
                </div>
              </Link>
              <div className="flex gap-2 mt-3">
                {deal.contact.email && <button onClick={() => setShowComposer(true)} className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-purple-50" style={{ color: '#5a1890' }}>Send email</button>}
                {deal.contact.phone_number && <a href={`tel:${deal.contact.phone_number}`} className="px-3 py-1.5 text-xs font-medium text-blue-600 rounded-lg hover:bg-blue-50">Call</a>}
              </div>
            </div>
          )}

          {/* Account card */}
          {deal.account && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Linked account</h3>
              <Link href={`/accounts/${deal.account.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                  {deal.account.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{deal.account.name}</p>
                  <p className="text-xs text-gray-400">{deal.account.industry || ''} {'\u00B7'} Health: {deal.account.health_score_total}/20</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${deal.account.health_status === 'healthy' ? 'bg-green-100 text-green-700' : deal.account.health_status === 'at_risk' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {deal.account.health_status === 'at_risk' ? 'At risk' : deal.account.health_status}
                </span>
              </Link>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notes</h3>
            {deal.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{deal.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes. Click "Edit deal" to add context about this deal.</p>
            )}
          </div>

          {/* No contact/account linked */}
          {!deal.contact && !deal.account && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm text-amber-800 mb-1">This deal has no linked contact or account.</p>
              <p className="text-xs text-amber-600">Click "Edit deal" to link a contact or account. This helps track communications and context.</p>
            </div>
          )}
        </div>
      </div>

      <EmailComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        toEmail={deal.contact?.email || ''}
        toName={deal.contact?.full_name}
        accountId={deal.account?.id}
        contactId={deal.contact?.id}
      />
    </div>
  )
}
