// src/app/(dashboard)/interactions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
      if (!profile) return

      const { data } = await supabase
        .from('interactions')
        .select('*, account:accounts(id, name), contact:contacts(id, full_name), user:users(id, full_name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(100)

      setInteractions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const channelIcons: Record<string, string> = { whatsapp: '💬', email: '📧', call: '📞', meeting: '🤝', sms: '📱', in_person: '👤', other: '📝' }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Interactions</h1>
        <p className="text-sm text-gray-500 mt-0.5">All interactions across your accounts, most recent first.</p>
      </div>

      {interactions.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-500">No interactions logged yet. Log your first interaction from an account page.</div>
      ) : (
        <div className="space-y-3">
          {interactions.map(i => (
            <div key={i.id} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-3">
              <div className="text-lg">{channelIcons[i.channel] || '📝'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{i.subject || i.channel}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${i.direction === 'outbound' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{i.direction}</span>
                  {i.account && <Link href={`/accounts/${i.account.id}`} className="text-xs text-purple-700 hover:underline">{i.account.name}</Link>}
                </div>
                {i.content && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{i.content}</p>}
                <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                  <span>{new Date(i.created_at).toLocaleString('en-NG')}</span>
                  {i.user && <span>by {i.user.full_name}</span>}
                  {i.contact && <span>with {i.contact.full_name}</span>}
                  {i.follow_up_required && <span className="text-amber-600 font-medium">Follow-up needed</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
