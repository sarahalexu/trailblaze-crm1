// src/app/(dashboard)/interactions/page.tsx
// Unified inbox: Gmail threads, WhatsApp messages, manual logs
// Conversation-style display with expandable threads

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface TimelineItem {
  id: string
  source: 'email' | 'whatsapp' | 'manual'
  channel: string
  direction: string
  subject: string | null
  content: string | null
  html_content: string | null
  created_at: string
  account_id: string | null
  account_name: string | null
  contact_id: string | null
  contact_name: string | null
  user_name: string | null
  from_address: string | null
  to_addresses: string[]
  // Thread grouping
  thread_id: string | null
  // WhatsApp
  wa_status: string | null
  wa_read_at: string | null
  wa_delivered_at: string | null
  // Email
  email_is_read: boolean
  has_attachments: boolean
  // Manual
  follow_up_required: boolean
  follow_up_date: string | null
  sentiment: string | null
}

type FilterType = 'all' | 'email' | 'whatsapp' | 'calls' | 'manual'

export default function InteractionsPage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [waConnected, setWaConnected] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const orgId = profile.org_id
    const timeline: TimelineItem[] = []

    // Check connection status
    const { data: gmailConn } = await supabase.from('gmail_connections').select('id').eq('user_id', profile.id).eq('is_active', true).single()
    setGmailConnected(!!gmailConn)

    const { data: waConn } = await supabase.from('whatsapp_config').select('id').eq('org_id', orgId).eq('is_active', true).single()
    setWaConnected(!!waConn)

    // 1. Synced emails
    const { data: emails } = await supabase
      .from('synced_emails')
      .select('*')
      .eq('org_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(200)

    for (const e of emails || []) {
      // Look up account/contact names
      let accountName = null
      let contactName = null
      if (e.account_id) {
        const { data: acc } = await supabase.from('accounts').select('name').eq('id', e.account_id).single()
        accountName = acc?.name || null
      }
      if (e.contact_id) {
        const { data: con } = await supabase.from('contacts').select('full_name').eq('id', e.contact_id).single()
        contactName = con?.full_name || null
      }

      timeline.push({
        id: e.id,
        source: 'email',
        channel: 'email',
        direction: e.direction,
        subject: e.subject,
        content: e.body_preview,
        html_content: e.body_html,
        created_at: e.sent_at,
        account_id: e.account_id,
        account_name: accountName,
        contact_id: e.contact_id,
        contact_name: contactName || e.from_name,
        user_name: e.direction === 'outbound' ? 'You' : e.from_name,
        from_address: e.from_address,
        to_addresses: typeof e.to_addresses === 'string' ? JSON.parse(e.to_addresses) : (e.to_addresses || []),
        thread_id: e.gmail_thread_id,
        wa_status: null, wa_read_at: null, wa_delivered_at: null,
        email_is_read: e.is_read,
        has_attachments: e.has_attachments,
        follow_up_required: false, follow_up_date: null, sentiment: null,
      })
    }

    // 2. WhatsApp messages
    const { data: waMessages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('org_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(200)

    for (const m of waMessages || []) {
      let contactName = null
      let accountId = null
      let accountName = null
      if (m.contact_id) {
        const { data: con } = await supabase.from('contacts').select('full_name, account_id').eq('id', m.contact_id).single()
        contactName = con?.full_name || null
        accountId = con?.account_id || null
        if (accountId) {
          const { data: acc } = await supabase.from('accounts').select('name').eq('id', accountId).single()
          accountName = acc?.name || null
        }
      }

      timeline.push({
        id: m.id,
        source: 'whatsapp',
        channel: 'whatsapp',
        direction: m.direction,
        subject: m.template_name ? `Template: ${m.template_name}` : null,
        content: m.content,
        html_content: null,
        created_at: m.sent_at,
        account_id: accountId,
        account_name: accountName,
        contact_id: m.contact_id,
        contact_name: contactName,
        user_name: m.direction === 'outbound' ? 'You' : contactName,
        from_address: null,
        to_addresses: [],
        thread_id: m.contact_id,
        wa_status: m.status,
        wa_read_at: m.read_at,
        wa_delivered_at: m.delivered_at,
        email_is_read: false, has_attachments: false,
        follow_up_required: false, follow_up_date: null, sentiment: null,
      })
    }

    // 3. Manual interactions
    const { data: manualInt } = await supabase
      .from('interactions')
      .select('*, account:accounts(id, name), contact:contacts(id, full_name), user:users(id, full_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)

    for (const i of manualInt || []) {
      timeline.push({
        id: i.id,
        source: 'manual',
        channel: i.channel,
        direction: i.direction,
        subject: i.subject,
        content: i.content,
        html_content: null,
        created_at: i.created_at,
        account_id: i.account?.id || null,
        account_name: i.account?.name || null,
        contact_id: i.contact?.id || null,
        contact_name: i.contact?.full_name || null,
        user_name: i.user?.full_name || null,
        from_address: null, to_addresses: [],
        thread_id: null,
        wa_status: null, wa_read_at: null, wa_delivered_at: null,
        email_is_read: false, has_attachments: false,
        follow_up_required: i.follow_up_required || false,
        follow_up_date: i.follow_up_date,
        sentiment: i.sentiment,
      })
    }

    timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setItems(timeline)
    setLoading(false)
  }

  function getFiltered(): TimelineItem[] {
    let result = items
    if (filter === 'email') result = result.filter(i => i.source === 'email')
    else if (filter === 'whatsapp') result = result.filter(i => i.source === 'whatsapp')
    else if (filter === 'calls') result = result.filter(i => i.channel === 'call' || i.channel === 'meeting')
    else if (filter === 'manual') result = result.filter(i => i.source === 'manual')

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        (i.subject || '').toLowerCase().includes(q) ||
        (i.content || '').toLowerCase().includes(q) ||
        (i.account_name || '').toLowerCase().includes(q) ||
        (i.contact_name || '').toLowerCase().includes(q) ||
        (i.from_address || '').toLowerCase().includes(q)
      )
    }
    return result
  }

  function formatTime(d: string): string {
    const date = new Date(d)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  function getSourceIcon(source: string, channel: string): string {
    if (source === 'email') return '\u{1F4E7}'
    if (source === 'whatsapp') return '\u{1F4AC}'
    if (channel === 'call') return '\u{1F4DE}'
    if (channel === 'meeting') return '\u{1F91D}'
    return '\u{1F4DD}'
  }

  function getSourceLabel(source: string, channel: string): { text: string; color: string } {
    if (source === 'email') return { text: 'Email', color: 'bg-red-50 text-red-700' }
    if (source === 'whatsapp') return { text: 'WhatsApp', color: 'bg-green-50 text-green-700' }
    if (channel === 'call') return { text: 'Call', color: 'bg-blue-50 text-blue-700' }
    if (channel === 'meeting') return { text: 'Meeting', color: 'bg-purple-50 text-purple-700' }
    return { text: 'Note', color: 'bg-gray-100 text-gray-600' }
  }

  function getDeliveryBadge(item: TimelineItem): { text: string; color: string } | null {
    if (item.source === 'whatsapp' && item.direction === 'outbound') {
      if (item.wa_status === 'read') return { text: '\u2713\u2713 Read', color: 'text-blue-600' }
      if (item.wa_status === 'delivered') return { text: '\u2713\u2713 Delivered', color: 'text-green-600' }
      if (item.wa_status === 'sent') return { text: '\u2713 Sent', color: 'text-gray-400' }
      if (item.wa_status === 'failed') return { text: '\u2717 Failed', color: 'text-red-500' }
    }
    return null
  }

  const filtered = getFiltered()
  const counts = {
    all: items.length,
    email: items.filter(i => i.source === 'email').length,
    whatsapp: items.filter(i => i.source === 'whatsapp').length,
    calls: items.filter(i => i.channel === 'call' || i.channel === 'meeting').length,
    manual: items.filter(i => i.source === 'manual').length,
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} conversations across {counts.email > 0 ? 'email, ' : ''}{counts.whatsapp > 0 ? 'WhatsApp, ' : ''}and manual logs
          </p>
        </div>
      </div>

      {/* Connection status banners */}
      {!gmailConnected && !waConnected && (
        <div className="mb-5 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-sm font-medium text-purple-900 mb-1">Connect your channels to see real conversations here</p>
          <p className="text-xs text-purple-600 mb-3">Right now, only manually logged interactions show up. Connect Gmail and WhatsApp to see actual email threads and message history.</p>
          <div className="flex gap-2">
            <Link href="/settings/integrations" className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#2b0548' }}>
              Connect Gmail & WhatsApp
            </Link>
          </div>
        </div>
      )}
      {!gmailConnected && waConnected && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-amber-700">Gmail is not connected. Email conversations will not appear here.</p>
          <Link href="/settings/integrations" className="text-xs font-medium text-amber-800 hover:underline">Connect Gmail</Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
          {([
            { key: 'all' as FilterType, label: 'All', count: counts.all },
            { key: 'email' as FilterType, label: '\u{1F4E7} Email', count: counts.email },
            { key: 'whatsapp' as FilterType, label: '\u{1F4AC} WhatsApp', count: counts.whatsapp },
            { key: 'calls' as FilterType, label: '\u{1F4DE} Calls', count: counts.calls },
            { key: 'manual' as FilterType, label: '\u{1F4DD} Logged', count: counts.manual },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
              {f.count > 0 && <span className="text-gray-400 ml-1">({f.count})</span>}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="flex-1 max-w-xs px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
        />
      </div>

      {/* Inbox list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          {items.length === 0 ? (
            <>
              <p className="text-3xl mb-3">{'\u{1F4EC}'}</p>
              <p className="text-sm text-gray-600 mb-1">Your inbox is empty</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                Connect Gmail and WhatsApp from the Integrations page to see your email and message threads here automatically. You can also log interactions manually from any account page.
              </p>
              <Link href="/settings/integrations" className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2b0548' }}>
                Go to Integrations
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-500">No results match your search.</p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {filtered.map(item => {
            const isExpanded = expandedId === item.id
            const sourceLabel = getSourceLabel(item.source, item.channel)
            const delivery = getDeliveryBadge(item)
            const isInbound = item.direction === 'inbound'

            return (
              <div key={`${item.source}-${item.id}`}>
                {/* Row */}
                <div
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    item.source === 'email' && !item.email_is_read && item.direction === 'inbound' ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                    isInbound ? 'bg-gray-100' : 'bg-purple-50'
                  }`}>
                    {getSourceIcon(item.source, item.channel)}
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Sender / contact */}
                      <span className={`text-sm truncate ${
                        item.source === 'email' && !item.email_is_read && isInbound ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                      }`}>
                        {isInbound ? (item.contact_name || item.from_address || 'Unknown') : `You \u{2192} ${item.contact_name || item.to_addresses?.[0] || 'Unknown'}`}
                      </span>

                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${sourceLabel.color}`}>
                        {sourceLabel.text}
                      </span>

                      {item.has_attachments && (
                        <span className="text-gray-400 text-xs flex-shrink-0">{'\u{1F4CE}'}</span>
                      )}

                      {item.follow_up_required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium flex-shrink-0">Follow-up</span>
                      )}
                    </div>

                    {/* Subject */}
                    {item.subject && (
                      <p className={`text-sm truncate ${
                        item.source === 'email' && !item.email_is_read && isInbound ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {item.subject}
                      </p>
                    )}

                    {/* Preview */}
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.content?.slice(0, 120) || 'No content'}
                    </p>
                  </div>

                  {/* Right side: time + status */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-400">{formatTime(item.created_at)}</span>
                    {delivery && (
                      <span className={`text-[10px] font-medium ${delivery.color}`}>{delivery.text}</span>
                    )}
                    {item.account_name && (
                      <span className="text-[10px] text-purple-600 truncate max-w-[100px]">{item.account_name}</span>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                    <div className="ml-11">
                      {/* Email details */}
                      {item.source === 'email' && (
                        <div className="mb-3 text-xs text-gray-400 space-y-0.5">
                          <p>From: <span className="text-gray-600">{item.from_address}</span></p>
                          {item.to_addresses.length > 0 && (
                            <p>To: <span className="text-gray-600">{item.to_addresses.join(', ')}</span></p>
                          )}
                          <p>{new Date(item.created_at).toLocaleString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      )}

                      {/* WhatsApp details */}
                      {item.source === 'whatsapp' && (
                        <div className="mb-3 text-xs text-gray-400 space-y-0.5">
                          <p>{new Date(item.created_at).toLocaleString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          {item.wa_read_at && <p className="text-blue-500">Read at {new Date(item.wa_read_at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>}
                          {item.wa_delivered_at && !item.wa_read_at && <p className="text-green-500">Delivered at {new Date(item.wa_delivered_at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>}
                        </div>
                      )}

                      {/* Message body */}
                      {item.html_content ? (
                        <div
                          className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: item.html_content }}
                          style={{ wordBreak: 'break-word' }}
                        />
                      ) : item.content ? (
                        <div className={`text-sm rounded-lg p-3 max-w-xl whitespace-pre-wrap break-words ${
                          isInbound
                            ? 'bg-white border border-gray-200 text-gray-700'
                            : 'text-gray-700 border-l-2 border-purple-300 bg-purple-50 pl-3'
                        }`}>
                          {item.content}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No message content</p>
                      )}

                      {/* Meta links */}
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        {item.account_id && (
                          <Link href={`/accounts/${item.account_id}`} className="text-purple-600 hover:underline">
                            View {item.account_name || 'account'}
                          </Link>
                        )}
                        {!item.account_id && item.contact_name && (
                          <span className="text-gray-400">Not matched to an account</span>
                        )}
                        {item.source === 'manual' && item.user_name && (
                          <span className="text-gray-400">Logged by {item.user_name}</span>
                        )}
                        {item.follow_up_date && (
                          <span className="text-amber-600">Follow up by {new Date(item.follow_up_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
