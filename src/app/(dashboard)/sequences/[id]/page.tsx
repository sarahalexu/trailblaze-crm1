// src/app/(dashboard)/sequences/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SequenceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [sequence, setSequence] = useState<any>(null)
  const [steps, setSteps] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'steps' | 'enrolled' | 'performance'>('steps')
  // Step form
  const [showAddStep, setShowAddStep] = useState(false)
  const [stepChannel, setStepChannel] = useState('email')
  const [stepSubject, setStepSubject] = useState('')
  const [stepMessage, setStepMessage] = useState('')
  const [stepDelay, setStepDelay] = useState(3)
  // Enroll form
  const [showEnroll, setShowEnroll] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: seq } = await supabase.from('sequences').select('*').eq('id', id).single()
    setSequence(seq)

    const { data: stepsData } = await supabase.from('sequence_steps').select('*').eq('sequence_id', id).order('step_number')
    setSteps(stepsData || [])

    const { data: enrollData } = await supabase.from('sequence_enrollments')
      .select('*, contact:contacts(full_name, email, whatsapp_number), account:accounts(name)')
      .eq('sequence_id', id).order('enrolled_at', { ascending: false })
    setEnrollments(enrollData || [])

    // Load available contacts for enrollment
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
      if (profile) {
        const { data: contactsData } = await supabase.from('contacts')
          .select('id, full_name, email, whatsapp_number, account:accounts(name)')
          .eq('org_id', profile.org_id).order('full_name')
        setContacts(contactsData || [])
      }
    }
    setLoading(false)
  }

  async function addStep() {
    if (!stepMessage) return
    setSaving(true)
    const nextNum = steps.length + 1
    await supabase.from('sequence_steps').insert({
      sequence_id: id, step_number: nextNum, delay_days: nextNum === 1 ? 0 : stepDelay,
      channel: stepChannel, subject: stepSubject || null, message_template: stepMessage,
    })
    setSaving(false); setShowAddStep(false)
    setStepSubject(''); setStepMessage(''); setStepDelay(3)
    load()
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Delete this step?')) return
    await supabase.from('sequence_steps').delete().eq('id', stepId)
    load()
  }

  async function toggleStatus() {
    if (!sequence) return
    const newStatus = sequence.status === 'active' ? 'paused' : 'active'
    if (newStatus === 'active' && steps.length === 0) {
      alert('Add at least one step before activating.')
      return
    }
    await supabase.from('sequences').update({ status: newStatus }).eq('id', id)
    load()
  }

  async function enrollContacts() {
    if (selectedContacts.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const firstStep = steps[0]
    const now = new Date()
    const firstSendAt = firstStep ? new Date(now.getTime() + (firstStep.delay_days * 24 * 60 * 60 * 1000)) : now

    for (const contactId of selectedContacts) {
      const contact = contacts.find(c => c.id === contactId)
      // Check not already enrolled
      const existing = enrollments.find(e => e.contact_id === contactId && (e.status === 'active' || e.status === 'paused'))
      if (existing) continue

      await supabase.from('sequence_enrollments').insert({
        sequence_id: id, contact_id: contactId, account_id: contact?.account?.id || null,
        org_id: profile.org_id, enrolled_by_user_id: profile.id,
        current_step: 0, status: 'active', next_send_at: firstSendAt.toISOString(),
      })
    }

    // Update total_enrolled count
    await supabase.from('sequences').update({
      total_enrolled: (sequence?.total_enrolled || 0) + selectedContacts.length
    }).eq('id', id)

    setSaving(false); setShowEnroll(false); setSelectedContacts([])
    load()
  }

  async function unenroll(enrollmentId: string) {
    await supabase.from('sequence_enrollments').update({ status: 'paused' }).eq('id', enrollmentId)
    load()
  }

  const tokens = ['{first_name}', '{company_name}', '{account_manager_name}', '{meeting_link}']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>
  if (!sequence) return <div className="text-center py-16 text-gray-500">Sequence not found.</div>

  const activeEnrollments = enrollments.filter(e => e.status === 'active').length
  const repliedEnrollments = enrollments.filter(e => e.status === 'replied').length
  const completedEnrollments = enrollments.filter(e => e.status === 'completed').length

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/sequences" className="hover:text-gray-600">Sequences</Link><span>/</span><span className="text-gray-700">{sequence.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-medium text-gray-900">{sequence.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                sequence.status === 'active' ? 'bg-green-100 text-green-700' :
                sequence.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>{sequence.status}</span>
            </div>
            {sequence.description && <p className="text-sm text-gray-500">{sequence.description}</p>}
            <p className="text-xs text-gray-400 mt-1">Sends as: {sequence.sender_name} ({sequence.sender_email}) · {sequence.channel}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEnroll(true)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">+ Enroll contacts</button>
            <button onClick={toggleStatus} className={`px-3 py-2 rounded-lg text-sm font-medium ${
              sequence.status === 'active' ? 'bg-amber-100 text-amber-700' : ''
            }`} style={sequence.status !== 'active' ? { background: '#2b0548', color: '#e1b3ee' } : {}}>
              {sequence.status === 'active' ? 'Pause' : 'Activate'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-medium text-gray-900">{steps.length}</div>
            <div className="text-xs text-gray-500">Steps</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-medium" style={{ color: '#5a1890' }}>{activeEnrollments}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-medium text-green-700">{repliedEnrollments}</div>
            <div className="text-xs text-gray-500">Replied</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-medium text-gray-700">{completedEnrollments}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-5">
        {[
          { key: 'steps' as const, label: `Steps (${steps.length})` },
          { key: 'enrolled' as const, label: `Enrolled (${enrollments.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === tab.key ? 'border-purple-700 text-purple-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
        ))}
      </div>

      {/* STEPS TAB */}
      {activeTab === 'steps' && (
        <div>
          {steps.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-500 mb-4">No steps yet. Add your first follow-up message.</p>
              <button onClick={() => setShowAddStep(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Add first step</button>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={step.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>{step.step_number}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {step.channel === 'email' ? '📧' : '💬'} {step.subject || `Step ${step.step_number}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {step.delay_days === 0 ? 'Immediately on enrollment' : `${step.delay_days} day${step.delay_days !== 1 ? 's' : ''} after step ${step.step_number - 1}`}
                          {' · '}{step.channel}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteStep(step.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{step.message_template}</div>
                </div>
              ))}
              <button onClick={() => setShowAddStep(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-purple-300 hover:text-purple-700 transition-colors">
                + Add step {steps.length + 1}
              </button>
            </div>
          )}

          {/* Add Step Modal */}
          {showAddStep && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowAddStep(false)}>
              <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add step {steps.length + 1}</h3>
                <div className="space-y-4">
                  {steps.length > 0 && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Send after</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" max="30" value={stepDelay} onChange={e => setStepDelay(parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                        <span className="text-sm text-gray-500">days after previous step (if no reply)</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Channel</label>
                    <select value={stepChannel} onChange={e => setStepChannel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="email">📧 Email</option>
                      <option value="whatsapp">💬 WhatsApp</option>
                    </select>
                  </div>
                  {stepChannel === 'email' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Subject line</label>
                      <input type="text" value={stepSubject} onChange={e => setStepSubject(e.target.value)}
                        placeholder="e.g. Quick follow-up, {first_name}"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Message *</label>
                    <textarea value={stepMessage} onChange={e => setStepMessage(e.target.value)} rows={6}
                      placeholder={stepChannel === 'whatsapp'
                        ? "Hey {first_name}, this is {account_manager_name}. Just checking in..."
                        : "Hi {first_name},\n\nI wanted to follow up on my previous message..."}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">Insert:</span>
                      {tokens.map(t => (
                        <button key={t} onClick={() => setStepMessage(prev => prev + t)}
                          className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100">{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                    This message will be sent automatically from <strong>{sequence?.sender_name}</strong>. It will feel like a personal message — not a marketing email. The sequence stops as soon as the contact replies.
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddStep(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
                  <button onClick={addStep} disabled={saving || !stepMessage} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                    {saving ? 'Adding...' : 'Add step'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ENROLLED TAB */}
      {activeTab === 'enrolled' && (
        <div>
          {enrollments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-500 mb-4">No contacts enrolled yet.</p>
              <button onClick={() => setShowEnroll(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Enroll contacts</button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Account</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Step</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Next send</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{e.contact?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">{e.contact?.email || e.contact?.whatsapp_number || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{e.account?.name || '—'}</td>
                      <td className="py-3 px-4">{e.current_step}/{steps.length}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          e.status === 'replied' ? 'bg-green-100 text-green-700' :
                          e.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                          e.status === 'converted' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{e.status}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">
                        {e.status === 'active' && e.next_send_at ? new Date(e.next_send_at).toLocaleDateString('en-NG') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {e.status === 'active' && (
                          <button onClick={() => unenroll(e.id)} className="text-xs text-red-500 hover:text-red-700">Pause</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Enroll Modal */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowEnroll(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Enroll contacts</h3>
            <p className="text-sm text-gray-500 mb-4">Select contacts to add to "{sequence.name}". Already-enrolled contacts are skipped.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No contacts found. Add contacts to accounts first.</p>
              ) : contacts.map(c => {
                const alreadyEnrolled = enrollments.some(e => e.contact_id === c.id && (e.status === 'active' || e.status === 'paused'))
                return (
                  <label key={c.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${alreadyEnrolled ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" disabled={alreadyEnrolled}
                      checked={selectedContacts.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedContacts(prev => [...prev, c.id])
                        else setSelectedContacts(prev => prev.filter(id => id !== c.id))
                      }}
                      className="w-4 h-4 rounded" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{c.full_name}</div>
                      <div className="text-xs text-gray-400">{c.account?.name || ''} · {c.email || c.whatsapp_number || ''}</div>
                    </div>
                    {alreadyEnrolled && <span className="text-xs text-gray-400 ml-auto">Already enrolled</span>}
                  </label>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEnroll(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={enrollContacts} disabled={saving || selectedContacts.length === 0}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {saving ? 'Enrolling...' : `Enroll ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
