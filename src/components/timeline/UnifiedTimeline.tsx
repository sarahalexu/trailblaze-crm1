// src/components/timeline/UnifiedTimeline.tsx
// Updated: Thread grouping, real app icons (SVG), cleaner labels, no repetitive badges

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EmailComposer from '@/components/email/EmailComposer'

// Real app icons as inline SVGs
function GmailIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><path fill="#EA4335" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/></svg>
}
function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
}
function NoteIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
}

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
  waStatus: string | null
  emailIsRead: boolean
  hasAttachments: boolean
  followUp: boolean
  threadId: string | null
}

interface Thread {
  threadId: string
  subject: string
  lastDate: string
  source: string
  contactName: string | null
  entries: TimelineEntry[]
}

interface UnifiedTimelineProps {
  accountId: string
  contacts?: { id: string; full_name: string; email?: string | null }[]
}

export default function UnifiedTimeline({ accountId, contacts = [] }: UnifiedTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedThread, setExpandedThread] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'email' | 'whatsapp' | 'calls'>('all')
  const [showComposer, setShowComposer] = useState(false)
  const [replyTo, setReplyTo] = useState<{ subject: string; threadId: string; email: string } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadTimeline() }, [accountId])

  async function loadTimeline() {
    setLoading(true)
    const items: TimelineEntry[] = []

    // Synced emails
    const { data: emails } = await supabase
      .from('synced_emails')
      .select('*, contact:contacts(id, full_name)')
      .eq('account_id', accountId)
      .order('sent_at', { ascending: false })
      .limit(200)

    for (const e of emails || []) {
      items.push({
        id: e.id, source: 'email', direction: e.direction, channel: 'email',
        subject: e.subject, content: e.body_preview, htmlContent: e.body_html,
        fromAddress: e.from_address, toAddresses: typeof e.to_addresses === 'string' ? JSON.parse(e.to_addresses) : (e.to_addresses || []),
        contactName: e.contact?.full_name || e.from_name || null, contactId: e.contact?.id || null,
        userName: e.direction === 'outbound' ? 'You' : null, createdAt: e.sent_at,
        waStatus: null, emailIsRead: e.is_read, hasAttachments: e.has_attachments,
        followUp: false, threadId: e.gmail_thread_id,
      })
    }

    // WhatsApp messages
    const contactIds = contacts.map(c => c.id).filter(Boolean)
    if (contactIds.length > 0) {
      const { data: waMessages } = await supabase
        .from('whatsapp_messages')
        .select('*, contact:contacts(id, full_name)')
        .in('contact_id', contactIds)
        .order('sent_at', { ascending: false })
        .limit(200)

      for (const m of waMessages || []) {
        items.push({
          id: m.id, source: 'whatsapp', direction: m.direction, channel: 'whatsapp',
          subject: null, content: m.content, htmlContent: null,
          fromAddress: null, toAddresses: [],
          contactName: m.contact?.full_name || null, contactId: m.contact?.id || null,
          userName: m.direction === 'outbound' ? 'You' : null, createdAt: m.sent_at,
          waStatus: m.status, emailIsRead: false, hasAttachments: false,
          followUp: false, threadId: `wa_${m.contact_id}`,
        })
      }
    }

    // Manual interactions (calls, meetings only - skip email/whatsapp since those are synced)
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*, user:users(full_name), contact:contacts(id, full_name)')
      .eq('account_id', accountId)
      .in('channel', ['call', 'meeting', 'in_person', 'other'])
      .order('created_at', { ascending: false })
      .limit(100)

    for (const i of interactions || []) {
      items.push({
        id: i.id, source: 'manual', direction: i.direction, channel: i.channel,
        subject: i.subject, content: i.content, htmlContent: null,
        fromAddress: null, toAddresses: [],
        contactName: i.contact?.full_name || null, contactId: i.contact?.id || null,
        userName: i.user?.full_name || null, createdAt: i.created_at,
        waStatus: null, emailIsRead: false, hasAttachments: false,
        followUp: i.follow_up_required || false, threadId: null,
      })
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setEntries(items)
    setLoading(false)
  }

  // Group entries into threads
  function getThreads(): (Thread | TimelineEntry)[] {
    const filtered = filter === 'all' ? entries :
      filter === 'email' ? entries.filter(e => e.source === 'email') :
      filter === 'whatsapp' ? entries.filter(e => e.source === 'whatsapp') :
      entries.filter(e => e.channel === 'call' || e.channel === 'meeting')

    const threadMap = new Map<string, TimelineEntry[]>()
    const standalone: TimelineEntry[] = []

    for (const entry of filtered) {
      if (entry.threadId && entry.source !== 'manual') {
        const existing = threadMap.get(entry.threadId) || []
        existing.push(entry)
        threadMap.set(entry.threadId, existing)
      } else {
        standalone.push(entry)
      }
    }

    const result: (Thread | TimelineEntry)[] = []

    // Convert thread groups
    for (const [tid, threadEntries] of threadMap) {
      const sorted = threadEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const latest = sorted[sorted.length - 1]
      const first = sorted[0]

      if (sorted.length === 1) {
        // Single email, show as standalone
        standalone.push(sorted[0])
      } else {
        result.push({
          threadId: tid,
          subject: first.subject || 'Conversation',
          lastDate: latest.createdAt,
          source: first.source,
          contactName: first.contactName,
          entries: sorted,
        })
      }
    }

    // Merge and sort by date
    const all = [
      ...result.map(t => ({ ...t, _sortDate: (t as Thread).lastDate })),
      ...standalone.map(e => ({ ...e, _sortDate: e.createdAt })),
    ].sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())

    return all.map(({ _sortDate, ...item }) => item as Thread | TimelineEntry)
  }

  function isThread(item: Thread | TimelineEntry): item is Thread {
    return 'entries' in item && Array.isArray((item as Thread).entries)
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

  function getIcon(source: string, channel: string) {
    if (source === 'email') return <GmailIcon className="w-4 h-4" />
    if (source === 'whatsapp') return <WhatsAppIcon className="w-4 h-4" />
    if (channel === 'call' || channel === 'meeting') return <PhoneIcon className="w-4 h-4" />
    return <NoteIcon className="w-4 h-4" />
  }

  function handleReply(entry: TimelineEntry) {
    const replyEmail = entry.direction === 'inbound' ? entry.fromAddress : (entry.toAddresses[0] || '')
    setReplyTo({ subject: entry.subject || '', threadId: entry.threadId || '', email: replyEmail || '' })
    setShowComposer(true)
  }

  const threadedItems = getThreads()
  const counts = {
    all: entries.length,
    email: entries.filter(e => e.source === 'email').length,
    whatsapp: entries.filter(e => e.source === 'whatsapp').length,
    calls: entries.filter(e => e.channel === 'call' || e.channel === 'meeting').length,
  }

  if (loading) return <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
          {([
            { key: 'all' as const, label: 'All', count: counts.all },
            { key: 'email' as const, label: 'Email', count: counts.email, icon: <GmailIcon className="w-3 h-3" /> },
            { key: 'whatsapp' as const, label: 'WhatsApp', count: counts.whatsapp, icon: <WhatsAppIcon className="w-3 h-3" /> },
            { key: 'calls' as const, label: 'Calls', count: counts.calls, icon: <PhoneIcon className="w-3 h-3" /> },
          ]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {f.icon}{f.label}{f.count > 0 ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>
        <button onClick={() => { setReplyTo(null); setShowComposer(true) }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
          style={{ background: '#2b0548', color: '#e1b3ee' }}>
          <GmailIcon className="w-3.5 h-3.5" /> Compose
        </button>
      </div>

      {threadedItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">{entries.length === 0 ? 'No activity on this account yet' : 'No results for this filter'}</p>
          {entries.length === 0 && <p className="text-xs text-gray-400 max-w-xs mx-auto">Synced emails and WhatsApp messages will appear here automatically.</p>}
        </div>
      ) : (
        <div className="space-y-1.5">
          {threadedItems.map((item, idx) => {
            if (isThread(item)) {
              // Thread view
              const thread = item
              const isExpanded = expandedThread === thread.threadId
              const lastEntry = thread.entries[thread.entries.length - 1]
              const isWA = thread.source === 'whatsapp'

              return (
                <div key={thread.threadId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Thread header */}
                  <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedThread(isExpanded ? null : thread.threadId)}>
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {isWA ? <WhatsAppIcon className="w-4 h-4" /> : <GmailIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{thread.subject}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{thread.entries.length} messages</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{lastEntry.content?.slice(0, 100)}</p>
                      {thread.contactName && <p className="text-[11px] text-gray-400 mt-0.5">{thread.contactName}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-gray-400">{formatTime(thread.lastDate)}</span>
                      <div className="text-gray-300 text-xs mt-1">{isExpanded ? '\u25B2' : '\u25BC'}</div>
                    </div>
                  </div>

                  {/* Expanded thread */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/30">
                      {thread.entries.map((entry, i) => {
                        const isOut = entry.direction === 'outbound'
                        return (
                          <div key={entry.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-xs font-medium ${isOut ? 'text-purple-700' : 'text-gray-700'}`}>
                                {isOut ? 'You' : (entry.contactName || entry.fromAddress || 'Contact')}
                              </span>
                              <span className="text-[10px] text-gray-400">{formatTime(entry.createdAt)}</span>
                              {entry.waStatus === 'read' && <span className="text-[10px] text-blue-500">{'\u2713\u2713'} Read</span>}
                              {entry.waStatus === 'delivered' && <span className="text-[10px] text-green-500">{'\u2713\u2713'}</span>}
                              {entry.hasAttachments && <span className="text-[10px] text-gray-400">{'\u{1F4CE}'}</span>}
                            </div>
                            {entry.htmlContent ? (
                              <div className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 p-3 max-h-60 overflow-y-auto" style={{ wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: entry.htmlContent }} />
                            ) : (
                              <div className={`text-sm rounded-lg p-2.5 max-w-lg whitespace-pre-wrap break-words ${isOut ? 'bg-purple-50 border-l-2 border-purple-300 ml-4' : 'bg-white border border-gray-200'}`}>
                                {entry.content || 'No content'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {/* Reply button */}
                      {thread.source === 'email' && (
                        <div className="px-4 py-2 border-t border-gray-100">
                          <button onClick={() => handleReply(lastEntry)} className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-purple-50" style={{ color: '#5a1890' }}>
                            {'\u21A9'} Reply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            } else {
              // Standalone entry (single email or call/meeting)
              const entry = item as TimelineEntry
              const isExpanded = expandedEntry === entry.id
              const isOut = entry.direction === 'outbound'

              return (
                <div key={`${entry.source}-${entry.id}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}>
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getIcon(entry.source, entry.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {entry.source === 'manual' ? `${entry.channel === 'call' ? 'Call' : entry.channel === 'meeting' ? 'Meeting' : entry.channel}${entry.subject ? ': ' + entry.subject : ''}` : (entry.subject || 'Message')}
                        </span>
                        {entry.hasAttachments && <span className="text-gray-400 text-xs">{'\u{1F4CE}'}</span>}
                        {entry.waStatus === 'read' && <span className="text-[10px] text-blue-500">{'\u2713\u2713'}</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{entry.content?.slice(0, 100)}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(entry.createdAt)}</span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-3 pt-2 ml-10">
                      {entry.source === 'email' && entry.fromAddress && (
                        <div className="text-[11px] text-gray-400 mb-2">
                          {isOut ? `To: ${entry.toAddresses.join(', ')}` : `From: ${entry.fromAddress}`}
                        </div>
                      )}
                      {entry.htmlContent ? (
                        <div className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 p-3 max-h-72 overflow-y-auto" style={{ wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: entry.htmlContent }} />
                      ) : entry.content ? (
                        <div className={`text-sm rounded-lg p-3 whitespace-pre-wrap break-words max-w-lg ${isOut ? 'bg-purple-50 border-l-2 border-purple-300' : 'bg-white border border-gray-200'}`}>
                          {entry.content}
                        </div>
                      ) : null}
                      {entry.source === 'email' && (
                        <button onClick={() => handleReply(entry)} className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-purple-50" style={{ color: '#5a1890' }}>{'\u21A9'} Reply</button>
                      )}
                    </div>
                  )}
                </div>
              )
            }
          })}
        </div>
      )}

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
