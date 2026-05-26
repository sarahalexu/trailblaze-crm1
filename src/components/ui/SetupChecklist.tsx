// src/components/ui/SetupChecklist.tsx
// Persistent setup checklist shown on dashboard until completed/dismissed

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CheckItem {
  key: string
  label: string
  description: string
  href: string
  done: boolean
}

export default function SetupChecklist() {
  const [items, setItems] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('tb_setup_dismissed') === 'true') {
      setDismissed(true)
      setLoading(false)
      return
    }
    checkSetup()
  }, [])

  async function checkSetup() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) { setLoading(false); return }

    // Check each setup step
    const { count: accountCount } = await supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { count: contactCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { data: gmailConn } = await supabase.from('gmail_connections').select('id').eq('user_id', profile.id).eq('is_active', true).single()
    const { data: waConn } = await supabase.from('whatsapp_config').select('id').eq('org_id', profile.org_id).eq('is_active', true).single()
    const { count: interactionCount } = await supabase.from('interactions').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { count: playbookCount } = await supabase.from('playbook_assignments').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)

    const checklist: CheckItem[] = [
      {
        key: 'account', label: 'Add your first account',
        description: 'Create an account for a company you manage',
        href: '/accounts', done: (accountCount || 0) > 0,
      },
      {
        key: 'contact', label: 'Add a contact',
        description: 'Add a person to one of your accounts',
        href: '/contacts', done: (contactCount || 0) > 0,
      },
      {
        key: 'gmail', label: 'Connect Gmail',
        description: 'Sync your email conversations automatically',
        href: '/settings/integrations', done: !!gmailConn,
      },
      {
        key: 'whatsapp', label: 'Connect WhatsApp',
        description: 'Send and receive WhatsApp messages from the CRM',
        href: '/settings/integrations', done: !!waConn,
      },
      {
        key: 'interaction', label: 'Log an interaction',
        description: 'Record a call, meeting, or message with a client',
        href: '/interactions', done: (interactionCount || 0) > 0,
      },
      {
        key: 'playbook', label: 'Activate a playbook',
        description: 'Start a guided workflow on one of your accounts',
        href: '/playbooks', done: (playbookCount || 0) > 0,
      },
    ]

    setItems(checklist)
    setLoading(false)

    // Auto-dismiss if all done
    if (checklist.every(i => i.done)) {
      setTimeout(() => setDismissed(true), 5000)
    }
  }

  function dismiss() {
    localStorage.setItem('tb_setup_dismissed', 'true')
    setDismissed(true)
  }

  if (loading || dismissed) return null

  const completedCount = items.filter(i => i.done).length
  const totalCount = items.length
  const pct = Math.round((completedCount / totalCount) * 100)

  if (pct === 100) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{'\u{1F389}'}</span>
          <div>
            <p className="text-sm font-medium text-green-800">Setup complete</p>
            <p className="text-xs text-green-600">You are all set. Your CRM is ready to go.</p>
          </div>
        </div>
        <button onClick={dismiss} className="text-xs text-green-600 hover:text-green-800">Dismiss</button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{'\u{1F680}'}</span>
          <div>
            <p className="text-sm font-medium text-gray-900">Get started with TrailBlaze CRM</p>
            <p className="text-xs text-gray-500">{completedCount} of {totalCount} steps completed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#5a1890' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: '#5a1890' }}>{pct}%</span>
          <button onClick={e => { e.stopPropagation(); dismiss() }} className="text-gray-300 hover:text-gray-500 text-lg leading-none" title="Dismiss">&times;</button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t border-gray-100 px-5 py-3 space-y-1">
          {items.map(item => (
            <Link key={item.key} href={item.href} className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-colors ${item.done ? 'opacity-60' : 'hover:bg-gray-50'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${item.done ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                {item.done && <span className="text-white text-[10px]">{'\u2713'}</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>{item.label}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
              {!item.done && <span className="text-xs text-purple-600">{'\u2192'}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
