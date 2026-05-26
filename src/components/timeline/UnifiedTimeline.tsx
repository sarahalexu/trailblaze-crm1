// src/components/timeline/UnifiedTimeline.tsx
// Drop-in replacement for the timeline tab on account detail pages
// Merges: manual interactions + synced emails + WhatsApp messages
// Usage: <UnifiedTimeline accountId="..." />

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EmailComposer from '@/components/email/EmailComposer'

interface TimelineEntry {
  id: string
  source: 'manual' | 'email' | 'whatsapp'
  direction: string
  channel: string
  subject: string | null
  content: string | null
  htmlContent: string | null
  fromAddress: string | null
  toAddresses: string[]
  contactName: string | null
  contactId: string | null
  userName: string | null
  createdAt: string
  // Status
  waStatus: string | null
  waReadAt: string | null
  emailIsRead: boolean
  hasAttachments: boolean
  followUp: boolean
  followUpDate: string | null
  // Reply info
  threadId: string | null
  gmailMessageId: string | null
}

interface UnifiedTimelineProps {
  accountId: string
  contacts?: { id: string; full_name: string; email?: string | null }[]
}

export default function UnifiedTimeline({ accountId, contacts = [] }: UnifiedTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'email' | 'whatsapp' | 'calls' | 'notes'>('all')
  const [showComposer, setShowComposer] = useState(false)
  const [replyTo, setReplyTo] = useState<{ subject: string; threadId: string; email: string } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadTimeline() }, [accountId])

  async function loadTimeline() {
    setLoading(true)
    const items: TimelineEntry[] = []

    // 1. Manual interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*, user:users(full_name), contact:contacts(id, full_name)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(100)

    for (const i of interactions || []) {
      items.push({
        id: i.id, source: 'manual', direction: i.direction, channel: i.channel,
        subject: i.subject, content: i.content, htmlContent: null,
        fromAddress: null, toAddresses: [],
        contactName: i.contact?.full_name || null, contactId: i.contact?.id || null,
        userName: i.user?.full_name || null, createdAt: i.created_at,
        waStatus: null, waReadAt: null, emailIsRead: false, hasAttachments: false,
        followUp: i.follow_up_required || false, followUpDate: i.follow_up_date,
        threadId: null, gmailMessageId: null,
      })
    }

    // 2. Synced emails
    const { data: emails } = await supabase
      .from('synced_emails')
      .select('*, contact:contacts(id, full_name)')
      .eq('account_id', accountId)
      .order('sent_at', { ascending: false })
      .limit(100)

    for (const e of emails || []) {
      items.push({
        id: e.id, source: 'email', direction: e.direction, channel: 'email',
        subject: e.subject, content: e.body_preview, htmlContent: e.body_html,
        fromAddress: e.from_address, toAddresses: typeof e.to_addresses === 'string' ? JSON.parse(e.to_addresses) : (e.to_addresses || []),
        contactName: e.contact?.full_name || e.from_name || null, contactId: e.contact?.id || null,
        userName: e.direction === 'outbound' ? 'You' : null, createdAt: e.sent_at,
        waStatus: null, waReadAt: null, emailIsRead: e.is_read, hasAttachments: e.has_attachments,
        followUp: false, followUpDate: null,
        threadId: e.gmail_thread_id, gmailMessageId: e.gmail_message_id,
      })
    }

    // 3. WhatsApp messages
    const { data: waMessages } = await supabase
      .from('whatsapp_messages')
      .select('*, contact:contacts(id, full_name)')
      .eq('account_id', accountId)
      .order('sent_at', { ascending: false })
      .limit(100)

    // If whatsapp_messages doesn't have account_id, query by contact IDs
    if ((!waMessages || waMessages.length === 0) && contacts.length > 0) {
      const contactIds = contacts.map(c => c.id)
      const { data: waByContact } = await supabase
        .from('whatsapp_messages')
        .select('*, contact:contacts(id, full_name)')
        .in('contact_id', contactIds)
        .order('sent_at', { ascending: false })
        .limit(100)

      for (const m of waByContact || []) {
        items.push({
          id: m.id, source: 'whatsapp', direction: m.direction, channel: 'whatsapp',
          subject: null, content: m.content, htmlContent: null,
          fromAddress: null, toAddresses: [],
          contactName: m.contact?.full_name || null, contactId: m.contact?.id || null,
          userName: m.direction === 'outbound' ? 'You' : null, createdAt: m.sent_at,
          waStatus: m.status, waReadAt: m.read_at, emailIsRead: false, hasAttachments: false,
          followUp: false, followUpDate: null, threadId: null, gmailMessageId: null,
        })
      }
    } else {
      for (const m of waMessages || []) {
        items.push({
          id: m.id, source: 'whatsapp', direction: m.direction, channel: 'whatsapp',
          subject: null, content: m.content, htmlContent: null,
          fromAddress: null, toAddresses: [],
          contactName: m.contact?.full_name || null, contactId: m.contact?.id || null,
          userName: m.direction === 'outbound' ? 'You' : null, createdAt: m.sent_at,
          waStatus: m.status, waReadAt: m.read_at, emailIsRead: false, hasAttachments: false,
          followUp: false, followUpDate: null, threadId: null, gmailMessageId: null,
        })
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setEntries(items)
    setLoading(false)
  }

  function getFiltered(): TimelineEntry[] {
    if (filter === 'all') return entries
    if (filter === 'email') return entries.filter(e => e.source === 'email')
    if (filter === 'whatsapp') return entries.filter(e => e.source === 'whatsapp')
    if (filter === 'calls') return entries.filter(e => e.channel === 'call' || e.channel === 'meeting')
    if (filter === 'notes') return entries.filter(e => e.source === 'manual')
    return entries
  }

  function formatTime(d: string): string {
    const date = new Date(d)
    const now = new Date()
    const diffDay = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDay === 0) return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    if (diffDay === 1) return 'Yesterday'
    if (diffDay < 7) return date.toLocaleDateString('en-NG', { weekday: 'short' })
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  function getIcon(source: string, channel: string): string {
    if (source === 'email') return '\u{1F4E7}'
    if (source === 'whatsapp') return '\u{1F4AC}'
    if (channel === 'call') return '\u{1F4DE}'
    if (channel === 'meeting') return '\u{1F91D}'
    if (channel === 'in_person') return '\u{1F464}'
    return '\u{1F4DD}'
  }

  function handleReply(entry: TimelineEntry) {
    const replyEmail = entry.direction === 'inbound' ? entry.fromAddress : (entry.toAddresses[0] || '')
    setReplyTo({
      subject: entry.subject || '',
      threadId: entry.threadId || '',
      email: replyEmail || '',
    })
    setShowComposer(true)
  }

  const filtered = getFiltered()
  const counts = {
    all: entries.length,
    email: entries.filter(e => e.source === 'email').length,
    whatsapp: entries.filter(e => e.source === 'whatsapp').length,
    calls: entries.filter(e => e.channel === 'call' || e.channel === 'meeting').length,
    notes: entries.filter(e => e.source === 'manual').length,
  }

  if (loading) {
    return <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto" /></div>
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
          {([
            { key: 'all' as const, label: 'All', count: counts.all },
            { key: 'email' as const, label: 'Email', count: counts.email },
            { key: 'whatsapp' as const, label: 'WhatsApp', count: counts.whatsapp },
            { key: 'calls' as const, label: 'Calls', count: counts.calls },
            { key: 'notes' as const, label: 'Notes', count: counts.notes },
          ]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {f.label}{f.count > 0 ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>
        <button onClick={() => { setReplyTo(null); setShowComposer(true) }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
          style={{ background: '#2b0548', color: '#e1b3ee' }}>
          {'\u{1F4E7}'} Compose
        </button>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-2xl mb-2">{'\u{1F4EC}'}</p>
          <p className="text-sm text-gray-600 mb-1">
            {entries.length === 0 ? 'No activity on this account yet' : 'No results for this filter'}
          </p>
          {entries.length === 0 && (
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Synced emails and WhatsApp messages will appear here automatically. You can also log calls, meetings, and notes manually.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(entry => {
            const isExpanded = expandedId === entry.id
            const isInbound = entry.direction === 'inbound'

            return (
              <div key={`${entry.source}-${entry.id}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${isInbound ? 'bg-gray-100' : 'bg-purple-50'}`}>
                    {getIcon(entry.source, entry.channel)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {entry.subject || `${entry.channel} ${entry.source === 'manual' ? 'note' : 'message'}`}
                      </span>
                      {entry.source === 'email' && <span className="text-[9px] px-1 py-0.5 rounded bg-red-50 text-red-600 font-medium">Email</span>}
                      {entry.source === 'whatsapp' && <span className="text-[9px] px-1 py-0.5 rounded bg-green-50 text-green-700 font-medium">WhatsApp</span>}
                      {entry.hasAttachments && <span className="text-gray-400 text-xs">{'\u{1F4CE}'}</span>}
                      {entry.followUp && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">Follow-up</span>}
                      {entry.waStatus === 'read' && <span className="text-[9px] text-blue-500 font-medium">{'\u2713\u2713'} Read</span>}
                      {entry.waStatus === 'delivered' && entry.waStatus !== 'read' && <span className="text-[9px] text-green-500">{'\u2713\u2713'}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{entry.content?.slice(0, 100) || 'No content'}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                      <span>{formatTime(entry.createdAt)}</span>
                      {entry.contactName && <span>{'\u00B7'} {entry.contactName}</span>}
                      {entry.userName && entry.userName !== 'You' && <span>{'\u00B7'} by {entry.userName}</span>}
                      {isInbound && <span className="text-gray-300">{'\u2199'} inbound</span>}
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-3 pb-3 pt-2 ml-10">
                    {entry.source === 'email' && (
                      <div className="text-[11px] text-gray-400 mb-2 space-y-0.5">
                        <p>From: {entry.fromAddress}</p>
                        {entry.toAddresses.length > 0 && <p>To: {entry.toAddresses.join(', ')}</p>}
                      </div>
                    )}

                    {entry.htmlContent ? (
                      <div className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 p-3 max-h-72 overflow-y-auto" style={{ wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: entry.htmlContent }} />
                    ) : entry.content ? (
                      <div className={`text-sm rounded-lg p-3 whitespace-pre-wrap break-words max-w-lg ${isInbound ? 'bg-white border border-gray-200' : 'bg-purple-50 border-l-2 border-purple-300'}`}>
                        {entry.content}
                      </div>
                    ) : null}

                    {/* Reply button for emails */}
                    {entry.source === 'email' && (
                      <button onClick={() => handleReply(entry)} className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-purple-50 transition-colors" style={{ color: '#5a1890' }}>
                        {'\u21A9'} Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Email composer */}
      <EmailComposer
        isOpen={showComposer}
        onClose={() => { setShowComposer(false); setReplyTo(null) }}
        onSent={() => loadTimeline()}
        accountId={accountId}
        toEmail={replyTo?.email || (contacts.find(c => c.email)?.email || undefined)}
        toName={replyTo ? undefined : contacts[0]?.full_name}
        replySubject={replyTo?.subject}
        threadId={replyTo?.threadId}
      />
    </div>
  )
}
