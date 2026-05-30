// src/components/stakeholder/StakeholderMap.tsx
// FIXED: Uses createClient from @/lib/supabase/client

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StakeholderMapProps {
  accountId: string
  orgId: string
}

interface Contact {
  id: string
  full_name: string
  job_title: string | null
  role_type: string | null
  email: string | null
}

interface Relationship {
  id: string
  from_contact_id: string
  to_contact_id: string
  relationship_type: string
  strength: string
  notes: string | null
}

const ROLE_COLORS: Record<string, string> = {
  decision_maker: '#EF4444', champion: '#8B5CF6', influencer: '#F59E0B',
  end_user: '#3B82F6', budget_holder: '#10B981', technical_evaluator: '#06B6D4',
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  reports_to: 'Reports to', manages: 'Manages', works_with: 'Works with',
  influences: 'Influences', blocks: 'Blocks', champions: 'Champions',
  budget_holder: 'Budget holder', decision_maker: 'Decision maker',
  end_user: 'End user', technical_evaluator: 'Technical evaluator',
}

const RELATIONSHIP_TYPES = ['reports_to', 'manages', 'works_with', 'influences', 'blocks', 'champions', 'budget_holder', 'decision_maker', 'end_user', 'technical_evaluator']
const STRENGTH_OPTIONS = ['strong', 'medium', 'weak']

export default function StakeholderMap({ accountId, orgId }: StakeholderMapProps) {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [relType, setRelType] = useState('works_with')
  const [relStrength, setRelStrength] = useState('medium')
  const [relNotes, setRelNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [accountId])

  async function loadData() {
    setLoading(true)
    const { data: contactData } = await supabase.from('contacts').select('id, full_name, job_title, role_type, email').eq('account_id', accountId).order('full_name')
    const { data: relData } = await supabase.from('stakeholder_relationships').select('*').eq('account_id', accountId)
    setContacts(contactData || [])
    setRelationships(relData || [])
    setLoading(false)
  }

  async function addRelationship() {
    if (!fromId || !toId || fromId === toId) return
    setSaving(true)
    const { error } = await supabase.from('stakeholder_relationships').insert({
      org_id: orgId, account_id: accountId, from_contact_id: fromId, to_contact_id: toId,
      relationship_type: relType, strength: relStrength, notes: relNotes.trim() || null,
    })
    if (!error) {
      await loadData()
      setShowAddModal(false); setFromId(''); setToId(''); setRelType('works_with'); setRelStrength('medium'); setRelNotes('')
    }
    setSaving(false)
  }

  async function removeRelationship(id: string) {
    if (!confirm('Remove this relationship?')) return
    await supabase.from('stakeholder_relationships').delete().eq('id', id)
    await loadData()
  }

  function getRoleColor(roleType: string | null) { return ROLE_COLORS[roleType || ''] || '#6B7280' }

  if (loading) return <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto" /></div>

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <p className="text-2xl mb-2">{'\u{1F465}'}</p>
        <p className="text-sm text-gray-600 mb-1">Add contacts to this account first</p>
        <p className="text-xs text-gray-400">Stakeholder mapping shows the relationships between contacts in this account.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Stakeholder Map</h3>
          <p className="text-xs text-gray-500 mt-0.5">Map the relationships and influence between contacts in this account.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Add Relationship</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {contacts.map(contact => {
          const outgoing = relationships.filter(r => r.from_contact_id === contact.id)
          const incoming = relationships.filter(r => r.to_contact_id === contact.id)
          const allRels = [...outgoing, ...incoming]
          const color = getRoleColor(contact.role_type)

          return (
            <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-4 relative">
              <div className="absolute top-0 left-0 w-full h-1 rounded-t-lg" style={{ backgroundColor: color }} />
              <div className="pt-1">
                <p className="font-medium text-sm text-gray-900">{contact.full_name}</p>
                {contact.job_title && <p className="text-xs text-gray-500">{contact.job_title}</p>}
                {contact.role_type && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs text-white font-medium" style={{ backgroundColor: color }}>
                    {contact.role_type.replace('_', ' ')}
                  </span>
                )}
                {allRels.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {allRels.map(rel => {
                      const isOutgoing = rel.from_contact_id === contact.id
                      const other = contacts.find(c => c.id === (isOutgoing ? rel.to_contact_id : rel.from_contact_id))
                      if (!other) return null
                      return (
                        <div key={rel.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-gray-50 group border border-gray-200">
                          <span className="text-gray-400">{isOutgoing ? '\u2192' : '\u2190'}</span>
                          <span className="text-gray-600 flex-1">
                            {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}{' '}
                            <span className="font-medium text-gray-900">{other.full_name}</span>
                          </span>
                          <button onClick={() => removeRelationship(rel.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">{'\u2715'}</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {allRels.length === 0 && <p className="mt-2 text-xs text-gray-400 italic">No relationships mapped</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <div key={role} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {role.replace('_', ' ')}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Relationship</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">Select contact...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Relationship</label>
                <select value={relType} onChange={e => setRelType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{RELATIONSHIP_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                <select value={toId} onChange={e => setToId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">Select contact...</option>
                  {contacts.filter(c => c.id !== fromId).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Strength</label>
                <div className="flex gap-2">
                  {STRENGTH_OPTIONS.map(s => (
                    <button key={s} onClick={() => setRelStrength(s)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border ${relStrength === s ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={relNotes} onChange={e => setRelNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={addRelationship} disabled={saving || !fromId || !toId} className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
