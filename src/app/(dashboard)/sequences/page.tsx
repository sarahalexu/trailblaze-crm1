// src/app/(dashboard)/sequences/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import Link from 'next/link'


export default function SequencesPage() {
  const [sequences, setSequences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newChannel, setNewChannel] = useState('email')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const { check, UpgradeModal } = usePlanLimits()
 const supabase = createClient()


  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id, full_name, email').eq('auth_id', user.id).single()
    if (!profile) return
    if (!senderName) setSenderName(profile.full_name)
    if (!senderEmail) setSenderEmail(profile.email)

    const { data } = await supabase.from('sequences')
      .select('*, steps:sequence_steps(count), enrollments:sequence_enrollments(count)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
    setSequences(data || [])
    setLoading(false)
  }

  async function createSequence() {
    if (!check('create_sequence')) return
    if (!newName) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: seq } = await supabase.from('sequences').insert({
      org_id: profile.org_id, name: newName, description: newDesc,
      channel: newChannel, sender_name: senderName, sender_email: senderEmail,
      created_by_user_id: profile.id, status: 'draft',
    }).select().single()

    setSaving(false)
    setShowCreate(false)
    setNewName(''); setNewDesc('')
    if (seq) window.location.href = `/sequences/${seq.id}`
    else load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  const active = sequences.filter(s => s.status === 'active')
  const drafts = sequences.filter(s => s.status === 'draft')
  const paused = sequences.filter(s => s.status === 'paused')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Sequences</h1>
          <p className="text-sm text-gray-500 mt-0.5">Automated follow-up sequences that send on your behalf until your contact responds.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ New sequence</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Active sequences</div>
          <div className="text-2xl font-medium text-gray-900">{active.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total enrolled</div>
          <div className="text-2xl font-medium" style={{ color: '#5a1890' }}>{sequences.reduce((s, seq) => s + (seq.total_enrolled || 0), 0)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total replies</div>
          <div className="text-2xl font-medium text-green-700">{sequences.reduce((s, seq) => s + (seq.total_replied || 0), 0)}</div>
        </div>
      </div>

      {sequences.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <div className="text-3xl mb-3">📧</div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">No sequences yet</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">Create an automated follow-up sequence to nurture leads and re-engage clients. Messages send from your name, feel personal, and stop when they reply.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Create your first sequence</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map(seq => {
            const replyRate = seq.total_enrolled > 0 ? Math.round((seq.total_replied / seq.total_enrolled) * 100) : 0
            return (
              <Link key={seq.id} href={`/sequences/${seq.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{seq.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        seq.status === 'active' ? 'bg-green-100 text-green-700' :
                        seq.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                        seq.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'
                      }`}>{seq.status}</span>
                      <span className="text-xs text-gray-400 capitalize">{seq.channel}</span>
                    </div>
                    {seq.description && <p className="text-xs text-gray-500 mt-1">{seq.description}</p>}
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </div>
                <div className="flex gap-6 text-xs text-gray-500">
                  <span>{seq.steps?.[0]?.count || 0} steps</span>
                  <span>{seq.total_enrolled || 0} enrolled</span>
                  <span>{seq.total_replied || 0} replied</span>
                  <span>{replyRate}% reply rate</span>
                  <span>Sends as: {seq.sender_name}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create new sequence</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sequence name *</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. New Lead Follow-Up, Renewal Check-In"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What's this sequence for?"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Channel</label>
                <select value={newChannel} onChange={e =>  {
                if (e.target.value === 'whatsapp' && !check('whatsapp_sequence')) return
                setNewChannel(e.target.value)
                }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="email">Email only</option>
                  <option value="whatsapp">WhatsApp only</option>
                  <option value="mixed">Mixed (email + WhatsApp)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sender name (shown as "from")</label>
                  <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sender email</label>
                  <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-xs text-purple-800">
                Messages will appear to come from <strong>{senderName || 'your name'}</strong> ({senderEmail || 'your email'}). Recipients won't know it's automated — when they reply, it goes to your real inbox.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={createSequence} disabled={saving || !newName} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {saving ? 'Creating...' : 'Create sequence'}
              </button>
            </div>
          </div>
        </div>
      )}
      <UpgradeModal />
    </div>
  )
}
