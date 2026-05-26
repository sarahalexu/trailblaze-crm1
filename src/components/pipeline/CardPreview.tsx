// src/components/pipeline/CardPreview.tsx
// Slide-out preview panel for pipeline cards
// Click a card to see details without navigating away
// Usage in pipeline pages: <CardPreview account={selectedAccount} onClose={() => setSelected(null)} />

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CardPreviewProps {
  accountId: string | null
  onClose: () => void
}

export default function CardPreview({ accountId, onClose }: CardPreviewProps) {
  const [account, setAccount] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [recentInteractions, setRecentInteractions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (accountId) { load(); setLoading(true) }
  }, [accountId])

  async function load() {
    if (!accountId) return

    const { data: acct } = await supabase
      .from('accounts')
      .select('*, stage:pipeline_stages(name, color), assigned_user:users!accounts_assigned_user_id_fkey(full_name)')
      .eq('id', accountId).single()
    setAccount(acct)

    const { data: ctcts } = await supabase
      .from('contacts')
      .select('id, full_name, email, job_title, is_primary')
      .eq('account_id', accountId)
      .order('is_primary', { ascending: false })
      .limit(5)
    setContacts(ctcts || [])

    const { data: ints } = await supabase
      .from('interactions')
      .select('id, channel, subject, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentInteractions(ints || [])

    setLoading(false)
  }

  if (!accountId) return null

  const channelIcons: Record<string, string> = {
    email: '\u{1F4E7}', call: '\u{1F4DE}', meeting: '\u{1F91D}',
    whatsapp: '\u{1F4AC}', sms: '\u{1F4F1}', in_person: '\u{1F464}', other: '\u{1F4DD}',
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-gray-200 z-40 overflow-y-auto shadow-lg"
        style={{ animation: 'slideInRight 0.15s ease' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>
        ) : account ? (
          <div>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{account.name}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">{'\u2715'}</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  account.health_status === 'healthy' ? 'bg-green-100 text-green-800' :
                  account.health_status === 'at_risk' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {account.health_status === 'at_risk' ? 'At risk' : account.health_status}
                </span>
                {account.stage && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: account.stage.color + '30', color: account.stage.color }}>
                    {account.stage.name}
                  </span>
                )}
              </div>
            </div>

            {/* KEEP Score */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Health</span>
                <span className={`text-lg font-semibold ${account.health_score_total >= 15 ? 'text-green-700' : account.health_score_total >= 10 ? 'text-amber-700' : 'text-red-700'}`}>
                  {account.health_score_total}/20
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { l: 'K', s: account.health_score_know, c: '#5a1890' },
                  { l: 'E', s: account.health_score_engage, c: '#00adef' },
                  { l: 'E', s: account.health_score_exceed, c: '#c9a54e' },
                  { l: 'P', s: account.health_score_prevent, c: '#1D9E75' },
                ].map(d => (
                  <div key={d.l + d.c} className="text-center">
                    <div className="text-[10px] text-gray-400">{d.l}</div>
                    <div className="h-1 bg-gray-200 rounded-full mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.s * 20}%`, background: d.c }} />
                    </div>
                    <div className="text-[10px] font-medium mt-0.5" style={{ color: d.c }}>{d.s}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key info */}
            <div className="p-4 border-b border-gray-100 space-y-1.5 text-xs">
              {account.contract_value_annual && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Contract</span>
                  <span className="text-gray-900 font-medium">{'\u20A6'}{account.contract_value_annual.toLocaleString()}/yr</span>
                </div>
              )}
              {account.renewal_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Renewal</span>
                  <span className="text-gray-900">{new Date(account.renewal_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {account.assigned_user && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Manager</span>
                  <span className="text-gray-900">{account.assigned_user.full_name}</span>
                </div>
              )}
              {account.industry && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Industry</span>
                  <span className="text-gray-900">{account.industry}</span>
                </div>
              )}
            </div>

            {/* Contacts */}
            {contacts.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2">Contacts</div>
                {contacts.map(c => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded -mx-1 px-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                      {c.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{c.full_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{c.job_title || c.email || ''}</p>
                    </div>
                    {c.is_primary && <span className="text-[8px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded">Primary</span>}
                  </Link>
                ))}
              </div>
            )}

            {/* Recent activity */}
            {recentInteractions.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2">Recent activity</div>
                {recentInteractions.map(i => (
                  <div key={i.id} className="flex items-center gap-2 py-1.5">
                    <span className="text-xs">{channelIcons[i.channel] || '\u{1F4DD}'}</span>
                    <span className="text-xs text-gray-700 truncate flex-1">{i.subject || i.channel}</span>
                    <span className="text-[10px] text-gray-400">{new Date(i.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Open full page */}
            <div className="p-4">
              <Link href={`/accounts/${accountId}`} className="block w-full py-2 text-center rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                Open full account
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  )
}
