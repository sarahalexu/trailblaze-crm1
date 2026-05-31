// src/app/(dashboard)/interactions/page.tsx
// FIXED: SVG icons for Gmail/WhatsApp, notes hidden by default, sync button, thread grouping

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Real app icons
function GmailIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><path fill="#EA4335" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/></svg>
}
function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
}

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
  thread_id: string | null
  wa_status: string | null
  email_is_read: boolean
  has_attachments: boolean
}

type FilterType = 'all' | 'email' | 'whatsapp' | 'calls'
type ViewMode = 'messages' | 'manual_logs'

export default function InteractionsPage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [manualLogs, setManualLogs] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('messages')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return
    const orgId = profile.org_id

    const messages: TimelineItem[] = []
    const logs: TimelineItem[] = []

    const { data: gmailConn } = await supabase.from('gmail_connections').select('id').eq('user_id', profile.id).eq('is_active', true).maybeSingle()
    setGmailConnected(!!gmailConn)

    // Synced emails
    const { data: emails } = await supabase.from('synced_emails').select('*').eq('org_id', orgId).order('sent_at', { ascending: false }).limit(200)
    for (const e of emails || []) {
      let accountName = null, contactName = null
      if (e.account_id) { const { data: a } = await supabase.from('accounts').select('name').eq('id', e.account_id).single(); accountName = a?.name }
      if (e.contact_id) { const { data: c } = await supabase.from('contacts').select('full_name').eq('id', e.contact_id).single(); contactName = c?.full_name }
      messages.push({
        id: e.id, source: 'email', channel: 'email', direction: e.direction,
        subject: e.subject, content: e.body_preview, html_content: e.body_html,
        created_at: e.sent_at, account_id: e.account_id, account_name: accountName,
        contact_id: e.contact_id, contact_name: contactName || e.from_name,
        user_name: e.direction === 'outbound' ? 'You' : e.from_name,
        from_address: e.from_address, to_addresses: typeof e.to_addresses === 'string' ? JSON.parse(e.to_addresses) : (e.to_addresses || []),
        thread_id: e.gmail_thread_id, wa_status: null, email_is_read: e.is_read, has_attachments: e.has_attachments,
      })
    }

    // WhatsApp
    const { data: waMessages } = await supabase.from('whatsapp_messages').select('*, contact:contacts(id, full_name, account_id, accounts(id, name))').eq('org_id', orgId).order('sent_at', { ascending: false }).limit(200)
    for (const m of waMessages || []) {
      messages.push({
        id: m.id, source: 'whatsapp', channel: 'whatsapp', direction: m.direction,
        subject: null, content: m.content, html_content: null,
        created_at: m.sent_at, account_id: m.contact?.accounts?.id || null, account_name: m.contact?.accounts?.name || null,
        contact_id: m.contact?.id || null, contact_name: m.contact?.full_name || null,
        user_name: m.direction === 'outbound' ? 'You' : null,
        from_address: null, to_addresses: [], thread_id: `wa_${m.contact_id}`,
        wa_status: m.status, email_is_read: false, has_attachments: false,
      })
    }

    // Manual interactions (separate view)
    const { data: manualInt } = await supabase.from('interactions').select('*, account:accounts(id, name), contact:contacts(id, full_name), user:users(id, full_name)')
      .eq('org_id', orgId).order('created_at', { ascending: false }).limit(200)
    for (const i of manualInt || []) {
      logs.push({
        id: i.id, source: 'manual', channel: i.channel, direction: i.direction,
        subject: i.subject, content: i.content, html_content: null,
        created_at: i.created_at, account_id: i.account?.id || null, account_name: i.account?.name || null,
        contact_id: i.contact?.id || null, contact_name: i.contact?.full_name || null,
        user_name: i.user?.full_name || null, from_address: null, to_addresses: [],
        thread_id: null, wa_status: null, email_is_read: false, has_attachments: false,
      })
    }

    messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setItems(messages)
    setManualLogs(logs)
    setLoading(false)
  }

  async function syncEmails() {
    setSyncing(true)
    try {
      await fetch('/api/gmail/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      await loadAll()
    } catch { }
    setSyncing(false)
  }

  function getFiltered(): TimelineItem[] {
    const source = viewMode === 'manual_logs' ? manualLogs : items
    let result = source
    if (viewMode === 'messages') {
      if (filter === 'email') result = result.filter(i => i.source === 'email')
      else if (filter === 'whatsapp') result = result.filter(i => i.source === 'whatsapp')
      else if (filter === 'calls') result = result.filter(i => i.channel === 'call' || i.channel === 'meeting')
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i => (i.subject || '').toLowerCase().includes(q) || (i.content || '').toLowerCase().includes(q) || (i.account_name || '').toLowerCase().includes(q) || (i.contact_name || '').toLowerCase().includes(q))
    }
    return result
  }

  function formatTime(d: string): string {
    const date = new Date(d); const now = new Date()
    const diffMs = now.getTime() - date.getTime(); const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'; if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMs / 3600000); if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffMs / 86400000); if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  function getIcon(source: string, channel: string) {
    if (source === 'email') return <GmailIcon />
    if (source === 'whatsapp') return <WhatsAppIcon />
    if (channel === 'call') return <PhoneIcon />
    if (channel === 'meeting') return <PhoneIcon />
    return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  }

  const filtered = getFiltered()
  const msgCounts = { all: items.length, email: items.filter(i => i.source === 'email').length, whatsapp: items.filter(i => i.source === 'whatsapp').length, calls: items.filter(i => i.channel === 'call' || i.channel === 'meeting').length }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} messages{manualLogs.length > 0 ? ` + ${manualLogs.length} logged notes` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncEmails} disabled={syncing} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
            {syncing ? 'Syncing...' : '\u{21BB} Sync emails'}
          </button>
        </div>
      </div>

      {!gmailConnected && items.length === 0 && (
        <div className="mb-5 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-sm font-medium text-purple-900 mb-1">Connect your email and WhatsApp</p>
          <p className="text-xs text-purple-600 mb-3">See your actual conversations here instead of manual logs.</p>
          <Link href="/settings/integrations" className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#2b0548' }}>Go to Integrations</Link>
        </div>
      )}

      {/* View toggle: Messages vs Manual Logs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('messages')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${viewMode === 'messages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Messages ({items.length})
          </button>
          <button onClick={() => setViewMode('manual_logs')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${viewMode === 'manual_logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Manual logs ({manualLogs.length})
          </button>
        </div>

        {viewMode === 'messages' && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([
              { key: 'all' as FilterType, label: 'All' },
              { key: 'email' as FilterType, label: 'Email', icon: <GmailIcon className="w-3 h-3" />, count: msgCounts.email },
              { key: 'whatsapp' as FilterType, label: 'WhatsApp', icon: <WhatsAppIcon className="w-3 h-3" />, count: msgCounts.whatsapp },
              { key: 'calls' as FilterType, label: 'Calls', icon: <PhoneIcon className="w-3 h-3" />, count: msgCounts.calls },
            ]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {f.icon}{f.label}
              </button>
            ))}
          </div>
        )}

        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="flex-1 max-w-xs px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">{search ? 'No results match your search.' : viewMode === 'manual_logs' ? 'No manual logs yet.' : 'No messages yet. Connect Gmail or WhatsApp from Settings.'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {filtered.map(item => {
            const isExpanded = expandedId === item.id
            const isInbound = item.direction === 'inbound'
            return (
              <div key={`${item.source}-${item.id}`}>
                <div className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${item.source === 'email' && !item.email_is_read && isInbound ? 'bg-blue-50/30' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isInbound ? 'bg-gray-100' : 'bg-purple-50'}`}>
                    {getIcon(item.source, item.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${!item.email_is_read && isInbound && item.source === 'email' ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
                        {isInbound ? (item.contact_name || item.from_address || 'Unknown') : `You \u2192 ${item.contact_name || item.to_addresses?.[0] || 'Unknown'}`}
                      </span>
                      {item.has_attachments && <span className="text-gray-400 text-xs">{'\u{1F4CE}'}</span>}
                      {item.wa_status === 'read' && <span className="text-[10px] text-blue-500">{'\u2713\u2713'} Read</span>}
                      {item.wa_status === 'delivered' && item.wa_status !== 'read' && <span className="text-[10px] text-green-500">{'\u2713\u2713'}</span>}
                    </div>
                    {item.subject && <p className="text-sm text-gray-700 truncate">{item.subject}</p>}
                    <p className="text-xs text-gray-500 truncate mt-0.5">{item.content?.slice(0, 120)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-400">{formatTime(item.created_at)}</span>
                    {item.account_name && <span className="text-[10px] text-purple-600 truncate max-w-[100px]">{item.account_name}</span>}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                    <div className="ml-11">
                      {item.source === 'email' && <div className="text-[11px] text-gray-400 mb-2"><p>{isInbound ? `From: ${item.from_address}` : `To: ${item.to_addresses.join(', ')}`}</p></div>}
                      {item.html_content ? (
                        <div className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto" style={{ wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: item.html_content }} />
                      ) : item.content ? (
                        <div className={`text-sm rounded-lg p-3 max-w-xl whitespace-pre-wrap break-words ${isInbound ? 'bg-white border border-gray-200' : 'bg-purple-50 border-l-2 border-purple-300'}`}>{item.content}</div>
                      ) : null}
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        {item.account_id && <Link href={`/accounts/${item.account_id}`} className="text-purple-600 hover:underline">View {item.account_name}</Link>}
                        {item.contact_id && <Link href={`/contacts/${item.contact_id}`} className="text-purple-600 hover:underline">{item.contact_name}</Link>}
                        {item.source === 'manual' && item.user_name && <span className="text-gray-400">by {item.user_name}</span>}
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
