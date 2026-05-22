// src/app/(dashboard)/interactions/page.tsx
// Rebuilt: Unified timeline showing actual WhatsApp messages, tracked emails,
// and manual logs. Conversation-style display like HubSpot.

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface TimelineItem {
  id: string
  type: 'interaction' | 'whatsapp' | 'email_tracked'
  channel: string
  direction: string
  subject: string | null
  content: string | null
  created_at: string
  // Shared
  account_id: string | null
  account_name: string | null
  contact_id: string | null
  contact_name: string | null
  user_name: string | null
  // WhatsApp-specific
  wa_status?: string
  wa_message_type?: string
  wa_read_at?: string | null
  wa_delivered_at?: string | null
  // Email-specific
  email_open_count?: number
  email_first_opened_at?: string | null
  email_recipient?: string | null
  // Interaction-specific
  follow_up_required?: boolean
  follow_up_date?: string | null
}

type FilterChannel = 'all' | 'whatsapp' | 'email' | 'call' | 'meeting' | 'manual'

export default function InteractionsPage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterChannel>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadTimeline()
  }, [])

  async function loadTimeline() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const orgId = profile.org_id
    const timeline: TimelineItem[] = []

    // 1. Manual interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*, account:accounts(id, name), contact:contacts(id, full_name), user:users(id, full_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)

    for (const i of interactions || []) {
      timeline.push({
        id: i.id,
        type: 'interaction',
        channel: i.channel,
        direction: i.direction,
        subject: i.subject,
        content: i.content,
        created_at: i.created_at,
        account_id: i.account?.id || null,
        account_name: i.account?.name || null,
        contact_id: i.contact?.id || null,
        contact_name: i.contact?.full_name || null,
        user_name: i.user?.full_name || null,
        follow_up_required: i.follow_up_required,
        follow_up_date: i.follow_up_date,
      })
    }

    // 2. WhatsApp messages (actual messages, not manual logs)
    const { data: waMessages } = await supabase
      .from('whatsapp_messages')
      .select('*, contact:contacts(id, full_name, account_id, accounts(id, name))')
      .eq('org_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(200)

    for (const m of waMessages || []) {
      timeline.push({
        id: m.id,
        type: 'whatsapp',
        channel: 'whatsapp',
        direction: m.direction,
        subject: m.template_name ? `Template: ${m.template_name}` : null,
        content: m.content,
        created_at: m.sent_at,
        account_id: m.contact?.accounts?.id || null,
        account_name: m.contact?.accounts?.name || null,
        contact_id: m.contact?.id || null,
        contact_name: m.contact?.full_name || null,
        user_name: m.direction === 'outbound' ? 'You' : null,
        wa_status: m.status,
        wa_message_type: m.message_type,
        wa_read_at: m.read_at,
        wa_delivered_at: m.delivered_at,
      })
    }

    // 3. Email tracking (sent emails with open tracking)
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('*, contact:contacts(id, full_name, account_id, accounts(id, name))')
      .eq('org_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(200)

    for (const e of emailTracking || []) {
      // Skip if there's already a manual interaction for this email
      const alreadyLogged = timeline.some(t =>
        t.type === 'interaction' && t.channel === 'email' &&
        t.contact_id === e.contact_id &&
        Math.abs(new Date(t.created_at).getTime() - new Date(e.sent_at).getTime()) < 120000
      )
      if (alreadyLogged) continue

      timeline.push({
        id: e.id,
        type: 'email_tracked',
        channel: 'email',
        direction: 'outbound',
        subject: e.subject,
        content: null,
        created_at: e.sent_at,
        account_id: e.contact?.accounts?.id || null,
        account_name: e.contact?.accounts?.name || null,
        contact_id: e.contact?.id || null,
        contact_name: e.contact?.full_name || null,
        user_name: 'You',
        email_open_count: e.open_count,
        email_first_opened_at: e.first_opened_at,
        email_recipient: e.recipient_email,
      })
    }

    // Sort all by date, newest first
    timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setItems(timeline)
    setLoading(false)
  }

  function getFiltered(): TimelineItem[] {
    let filtered = items

    if (filter === 'whatsapp') filtered = filtered.filter(i => i.channel === 'whatsapp')
    else if (filter === 'email') filtered = filtered.filter(i => i.channel === 'email')
    else if (filter === 'call') filtered = filtered.filter(i => i.channel === 'call' || i.channel === 'meeting')
    else if (filter === 'manual') filtered = filtered.filter(i => i.type === 'interaction')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        (i.content || '').toLowerCase().includes(q) ||
        (i.subject || '').toLowerCase().includes(q) ||
        (i.account_name || '').toLowerCase().includes(q) ||
        (i.contact_name || '').toLowerCase().includes(q)
      )
    }

    return filtered
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
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  function getChannelIcon(channel: string, type: string): string {
    if (type === 'whatsapp') return '💬'
    if (channel === 'email' || type === 'email_tracked') return '📧'
    if (channel === 'call') return '📞'
    if (channel === 'meeting') return '🤝'
    if (channel === 'sms') return '📱'
    if (channel === 'in_person') return '👤'
    return '📝'
  }

  function getStatusBadge(item: TimelineItem) {
    // WhatsApp delivery status
    if (item.type === 'whatsapp' && item.direction === 'outbound') {
      if (item.wa_status === 'read') return { text: 'Read', color: 'bg-blue-50 text-blue-700', icon: '✓✓' }
      if (item.wa_status === 'delivered') return { text: 'Delivered', color: 'bg-green-50 text-green-700', icon: '✓✓' }
      if (item.wa_status === 'sent') return { text: 'Sent', color: 'bg-gray-100 text-gray-600', icon: '✓' }
      if (item.wa_status === 'failed') return { text: 'Failed', color: 'bg-red-50 text-red-600', icon: '✗' }
    }
    // Email open tracking
    if ((item.type === 'email_tracked' || item.channel === 'email') && item.email_open_count !== undefined) {
      if (item.email_open_count > 0) return { text: `Opened ${item.email_open_count}x`, color: 'bg-green-50 text-green-700', icon: '👁' }
      return { text: 'Not opened', color: 'bg-gray-50 text-gray-500', icon: '' }
    }
    return null
  }

  const filtered = getFiltered()
  const channelCounts = {
    all: items.length,
    whatsapp: items.filter(i => i.channel === 'whatsapp').length,
    email: items.filter(i => i.channel === 'email').length,
    call: items.filter(i => i.channel === 'call' || i.channel === 'meeting').length,
    manual: items.filter(i => i.type === 'interaction').length,
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Interactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} interactions across all accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: 'all', label: 'All', count: channelCounts.all },
            { key: 'whatsapp', label: '💬 WhatsApp', count: channelCounts.whatsapp },
            { key: 'email', label: '📧 Email', count: channelCounts.email },
            { key: 'call', label: '📞 Calls', count: channelCounts.call },
            { key: 'manual', label: '📝 Manual', count: channelCounts.manual },
          ] as { key: FilterChannel; label: string; count: number }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label} {f.count > 0 && <span className="text-gray-400 ml-0.5">({f.count})</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, accounts..."
            className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-500 mb-1">
            {items.length === 0 ? 'No interactions yet.' : 'No results match your filter.'}
          </p>
          {items.length === 0 && (
            <p className="text-xs text-gray-400">WhatsApp messages and tracked emails will appear here automatically. You can also log interactions manually from any account page.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const isInbound = item.direction === 'inbound'
            const badge = getStatusBadge(item)
            const isActualMessage = item.type === 'whatsapp' || item.type === 'email_tracked'

            return (
              <div key={`${item.type}-${item.id}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Channel icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      isInbound ? 'bg-gray-100' : 'bg-purple-50'
                    }`}>
                      {getChannelIcon(item.channel, item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top row: subject/channel + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.subject ? (
                          <span className="text-sm font-medium text-gray-900">{item.subject}</span>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 capitalize">{item.channel} message</span>
                        )}

                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {isInbound ? '↙ Inbound' : '↗ Outbound'}
                        </span>

                        {isActualMessage && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
                            {item.type === 'whatsapp' ? 'WhatsApp' : 'Tracked email'}
                          </span>
                        )}

                        {badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
                            {badge.icon && <span className="mr-0.5">{badge.icon}</span>}
                            {badge.text}
                          </span>
                        )}

                        {item.follow_up_required && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                            Follow-up{item.follow_up_date ? ` by ${new Date(item.follow_up_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Message content */}
                      {item.content && (
                        <div className={`text-sm mb-2 rounded-lg px-3 py-2 max-w-xl ${
                          isInbound
                            ? 'bg-gray-50 text-gray-700 border-l-2 border-gray-300'
                            : 'bg-purple-50 text-gray-700 border-l-2 border-purple-300'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{item.content}</p>
                        </div>
                      )}

                      {/* Email recipient */}
                      {item.email_recipient && (
                        <p className="text-xs text-gray-400 mb-1">To: {item.email_recipient}</p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                        <span>{formatTime(item.created_at)}</span>
                        {item.account_name && (
                          <Link href={`/accounts/${item.account_id}`} className="text-purple-600 hover:underline">
                            {item.account_name}
                          </Link>
                        )}
                        {item.contact_name && <span>with {item.contact_name}</span>}
                        {item.user_name && item.user_name !== 'You' && <span>by {item.user_name}</span>}

                        {/* WhatsApp read timestamp */}
                        {item.wa_read_at && (
                          <span className="text-blue-500">
                            Read {new Date(item.wa_read_at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {item.wa_delivered_at && !item.wa_read_at && (
                          <span className="text-green-500">
                            Delivered {new Date(item.wa_delivered_at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        )}

                        {/* Email open timestamp */}
                        {item.email_first_opened_at && (
                          <span className="text-green-500">
                            First opened {new Date(item.email_first_opened_at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}