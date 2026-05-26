// src/app/(dashboard)/contacts/[id]/page.tsx
// Contact detail page - individual contact view with timeline, actions

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import EmailComposer from '@/components/email/EmailComposer'

interface ContactData {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
  whatsapp_number: string | null
  job_title: string | null
  role_type: string | null
  is_primary: boolean
  date_of_birth: string | null
  account_id: string | null
  account: { id: string; name: string; health_status: string } | null
  created_at: string
}

interface TimelineEntry {
  id: string
  type: 'interaction' | 'email' | 'whatsapp'
  direction: string
  subject: string | null
  content: string | null
  channel: string
  created_at: string
  user_name: string | null
  wa_status: string | null
  email_html: string | null
  from_address: string | null
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const [contact, setContact] = useState<ContactData | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)

    // Contact details
    const { data: c } = await supabase
      .from('contacts')
      .select('*, account:accounts(id, name, health_status)')
      .eq('id', id)
      .single()

    if (!c) { setLoading(false); return }
    setContact(c)
    setEditName(c.full_name)
    setEditEmail(c.email || '')
    setEditPhone(c.phone_number || '')
    setEditTitle(c.job_title || '')
    setEditRole(c.role_type || '')

    const entries: TimelineEntry[] = []

    // Manual interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*, user:users(full_name)')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(100)

    for (const i of interactions || []) {
      entries.push({
        id: i.id, type: 'interaction', direction: i.direction,
        subject: i.subject, content: i.content, channel: i.channel,
        created_at: i.created_at, user_name: i.user?.full_name || null,
        wa_status: null, email_html: null, from_address: null,
      })
    }

    // Synced emails
    const { data: emails } = await supabase
      .from('synced_emails')
      .select('*')
      .eq('contact_id', id)
      .order('sent_at', { ascending: false })
      .limit(100)

    for (const e of emails || []) {
      entries.push({
        id: e.id, type: 'email', direction: e.direction,
        subject: e.subject, content: e.body_preview, channel: 'email',
        created_at: e.sent_at, user_name: e.direction === 'outbound' ? 'You' : e.from_name,
        wa_status: null, email_html: e.body_html, from_address: e.from_address,
      })
    }

    // WhatsApp messages
    const { data: waMessages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('contact_id', id)
      .order('sent_at', { ascending: false })
      .limit(100)

    for (const m of waMessages || []) {
      entries.push({
        id: m.id, type: 'whatsapp', direction: m.direction,
        subject: null, content: m.content, channel: 'whatsapp',
        created_at: m.sent_at, user_name: m.direction === 'outbound' ? 'You' : null,
        wa_status: m.status, email_html: null, from_address: null,
      })
    }

    entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setTimeline(entries)
    setLoading(false)
  }

  async function saveContact() {
    if (!contact) return
    setSaving(true)
    await supabase.from('contacts').update({
      full_name: editName.trim(),
      email: editEmail.trim() || null,
      phone_number: editPhone.trim() || null,
      job_title: editTitle.trim() || null,
      role_type: editRole || null,
    }).eq('id', contact.id)
    setSaving(false)
    setEditing(false)
    load()
  }

  function formatTime(d: string): string {
    const date = new Date(d)
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function getIcon(type: string, channel: string): string {
    if (type === 'email') return '\u{1F4E7}'
    if (type === 'whatsapp') return '\u{1F4AC}'
    if (channel === 'call') return '\u{1F4DE}'
    if (channel === 'meeting') return '\u{1F91D}'
    return '\u{1F4DD}'
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>
  if (!contact) return <div className="text-center py-16 text-gray-500">Contact not found.</div>

  const initials = contact.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/contacts" className="hover:text-gray-600">Contacts</Link>
        <span>/</span>
        <span className="text-gray-700">{contact.full_name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact info */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold" style={{ background: '#2b054815', color: '#5a1890' }}>
                {initials}
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">{contact.full_name}</h1>
                {contact.job_title && <p className="text-sm text-gray-500">{contact.job_title}</p>}
              </div>
            </div>

            {/* Role badge */}
            {contact.role_type && (
              <span className="inline-block mb-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                {contact.role_type.replace('_', ' ')}
              </span>
            )}
            {contact.is_primary && (
              <span className="inline-block mb-3 ml-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Primary</span>
            )}

            {/* Contact details */}
            {!editing ? (
              <div className="space-y-2.5 text-sm mb-4">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-5 text-center">{'\u{1F4E7}'}</span>
                    <a href={`mailto:${contact.email}`} className="text-purple-600 hover:underline truncate">{contact.email}</a>
                  </div>
                )}
                {contact.phone_number && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-5 text-center">{'\u{1F4DE}'}</span>
                    <span className="text-gray-700">{contact.phone_number}</span>
                  </div>
                )}
                {contact.whatsapp_number && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-5 text-center">{'\u{1F4AC}'}</span>
                    <span className="text-gray-700">{contact.whatsapp_number}</span>
                  </div>
                )}
                {contact.account && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-5 text-center">{'\u{1F3E2}'}</span>
                    <Link href={`/accounts/${contact.account.id}`} className="text-purple-600 hover:underline">{contact.account.name}</Link>
                  </div>
                )}
                <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-purple-600 mt-2">Edit contact</button>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Job title" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">Role type</option>
                  <option value="decision_maker">Decision maker</option>
                  <option value="champion">Champion</option>
                  <option value="influencer">Influencer</option>
                  <option value="end_user">End user</option>
                  <option value="budget_holder">Budget holder</option>
                  <option value="technical_evaluator">Technical evaluator</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={saveContact} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#2b0548' }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              {contact.email && (
                <button onClick={() => setShowComposer(true)} className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left flex items-center gap-2 hover:bg-purple-50 transition-colors" style={{ color: '#5a1890' }}>
                  {'\u{1F4E7}'} Send email
                </button>
              )}
              {contact.whatsapp_number && (
                <a href={`https://wa.me/${contact.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left flex items-center gap-2 hover:bg-green-50 text-green-700 block">
                  {'\u{1F4AC}'} WhatsApp
                </a>
              )}
              {contact.phone_number && (
                <a href={`tel:${contact.phone_number}`} className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left flex items-center gap-2 hover:bg-blue-50 text-blue-700 block">
                  {'\u{1F4DE}'} Call
                </a>
              )}
            </div>

            {/* Meta */}
            <div className="border-t border-gray-100 pt-3 mt-4">
              <p className="text-xs text-gray-400">Added {formatTime(contact.created_at)}</p>
              <p className="text-xs text-gray-400">{timeline.length} interactions</p>
            </div>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">Activity ({timeline.length})</h2>
            {contact.email && (
              <button onClick={() => setShowComposer(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#2b0548' }}>
                {'\u{270F}\uFE0F'} Compose email
              </button>
            )}
          </div>

          {timeline.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <p className="text-2xl mb-2">{'\u{1F4EC}'}</p>
              <p className="text-sm text-gray-600 mb-1">No activity with {contact.full_name} yet</p>
              <p className="text-xs text-gray-400 mb-4">Emails and WhatsApp messages will appear here automatically when synced.</p>
              {contact.email && (
                <button onClick={() => setShowComposer(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2b0548' }}>
                  Send first email
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {timeline.map(entry => {
                const isExpanded = expandedId === entry.id
                const isInbound = entry.direction === 'inbound'

                return (
                  <div key={`${entry.type}-${entry.id}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isInbound ? 'bg-gray-100' : 'bg-purple-50'}`}>
                        {getIcon(entry.type, entry.channel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {entry.subject || entry.channel}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>
                            {isInbound ? '\u2199 In' : '\u2197 Out'}
                          </span>
                          {entry.type === 'email' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">Email</span>}
                          {entry.type === 'whatsapp' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">WhatsApp</span>}
                          {entry.wa_status === 'read' && <span className="text-[10px] text-blue-500">{'\u2713\u2713'} Read</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{entry.content?.slice(0, 120) || 'No content'}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(entry.created_at)}</span>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50 ml-11">
                        {entry.email_html ? (
                          <div className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 p-4 max-h-80 overflow-y-auto" dangerouslySetInnerHTML={{ __html: entry.email_html }} style={{ wordBreak: 'break-word' }} />
                        ) : entry.content ? (
                          <div className={`text-sm rounded-lg p-3 max-w-xl whitespace-pre-wrap break-words ${isInbound ? 'bg-white border border-gray-200' : 'bg-purple-50 border-l-2 border-purple-300'}`}>
                            {entry.content}
                          </div>
                        ) : null}

                        {entry.type === 'email' && contact.email && (
                          <button onClick={() => { setShowComposer(true) }} className="mt-3 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg">
                            Reply
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <EmailComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        onSent={() => load()}
        toEmail={contact.email || ''}
        toName={contact.full_name}
        accountId={contact.account_id || undefined}
        contactId={contact.id}
      />
    </div>
  )
}
