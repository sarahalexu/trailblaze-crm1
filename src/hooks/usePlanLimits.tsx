// src/hooks/usePlanLimits.tsx
// Client-side hook that checks plan limits and shows upgrade prompts
// Usage: const { check, showUpgrade, UpgradeModal } = usePlanLimits()
//        const allowed = await check('create_account')
//        if (!allowed) return // modal shows automatically

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Limits {
  plan: string
  max_accounts: number
  max_sequences: number
  max_active_contacts: number
  max_emails_per_day: number
  max_snippets: number
  email_tracking: boolean
  ai_features: boolean
  whatsapp_integration: boolean
  current_accounts: number
  current_sequences: number
  current_active_contacts: number
  current_snippets: number
}

export function usePlanLimits() {
  const [limits, setLimits] = useState<Limits | null>(null)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const supabase = createClient()

  // Load current limits and usage on mount
  useEffect(() => { loadLimits() }, [])

  async function loadLimits() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: org } = await supabase.from('organizations').select('plan_tier').eq('id', profile.org_id).single()
    if (!org) return

    const plan = org.plan_tier
    const isBeta = plan === 'beta'
    const isScale = plan === 'scale' || plan === 'enterprise'
    const isGrowth = plan === 'growth'

    // Count current usage
    const { count: accountCount } = await supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { count: seqCount } = await supabase.from('sequences').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { count: contactCount } = await supabase.from('sequence_enrollments').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id).eq('status', 'active')
    const { count: snippetCount } = await supabase.from('snippets').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)

    setLimits({
      plan,
      max_accounts: isBeta || isScale ? 99999 : isGrowth ? 500 : 15,
      max_sequences: isBeta || isScale ? 99999 : isGrowth ? 10 : 1,
      max_active_contacts: isBeta || isScale ? 99999 : isGrowth ? 200 : 25,
      max_emails_per_day: isBeta ? 1000 : isScale ? 1000 : isGrowth ? 200 : 25,
      max_snippets: isBeta || isScale ? 99999 : isGrowth ? 50 : 10,
      email_tracking: isBeta || isGrowth || isScale,
      ai_features: isBeta || isGrowth || isScale,
      whatsapp_integration: isBeta || isGrowth || isScale,
      current_accounts: accountCount || 0,
      current_sequences: seqCount || 0,
      current_active_contacts: contactCount || 0,
      current_snippets: snippetCount || 0,
    })
  }

  const check = useCallback((action: string): boolean => {
    if (!limits) return true // Still loading, allow action
    if (limits.plan === 'beta' || limits.plan === 'scale' || limits.plan === 'enterprise') return true

    switch (action) {
      case 'create_account':
        if (limits.current_accounts >= limits.max_accounts) {
          setUpgradeMessage(`You've reached the ${limits.max_accounts}-account limit on the ${limits.plan === 'starter' ? 'Free' : 'Growth'} plan. Upgrade to add more accounts.`)
          setShowUpgrade(true)
          return false
        }
        return true

      case 'create_sequence':
        if (limits.current_sequences >= limits.max_sequences) {
          setUpgradeMessage(`You can only have ${limits.max_sequences} sequence${limits.max_sequences === 1 ? '' : 's'} on the ${limits.plan === 'starter' ? 'Free' : 'Growth'} plan. Upgrade to create more.`)
          setShowUpgrade(true)
          return false
        }
        return true

      case 'enroll_contact':
        if (limits.current_active_contacts >= limits.max_active_contacts) {
          setUpgradeMessage(`You've reached ${limits.max_active_contacts} active contacts in sequences. Upgrade to enroll more contacts.`)
          setShowUpgrade(true)
          return false
        }
        return true

      case 'create_snippet':
        if (limits.current_snippets >= limits.max_snippets) {
          setUpgradeMessage(`You've reached the ${limits.max_snippets}-snippet limit. Upgrade for more snippets.`)
          setShowUpgrade(true)
          return false
        }
        return true

      case 'use_ai':
        if (!limits.ai_features) {
          setUpgradeMessage('AI features (risk analysis, draft message, suggested actions) are available on the Growth plan and above.')
          setShowUpgrade(true)
          return false
        }
        return true

      case 'email_tracking':
        if (!limits.email_tracking) {
          setUpgradeMessage('Email open tracking is available on the Growth plan. See who opens your emails and how many times.')
          setShowUpgrade(true)
          return false
        }
        return true

      case 'whatsapp_sequence':
        if (!limits.whatsapp_integration) {
          setUpgradeMessage('WhatsApp sequences are available on the Growth plan. Automate follow-ups through WhatsApp.')
          setShowUpgrade(true)
          return false
        }
        return true

      default:
        return true
    }
  }, [limits])

  // The upgrade modal component
  function UpgradeModal() {
    if (!showUpgrade) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
        onClick={() => setShowUpgrade(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.2s ease' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #5a1890, #00adef, #c9a54e)' }} />
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(90,24,144,0.08)' }}>
                <span className="text-xl">🚀</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Upgrade your plan</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{upgradeMessage}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">Growth plan</span>
                <span className="text-sm font-semibold" style={{ color: '#5a1890' }}>₦20,000<span className="text-xs text-gray-400 font-normal">/user/mo</span></span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>✓ 500 accounts · 10 sequences · 200 contacts</div>
                <div>✓ Email tracking · AI features · WhatsApp</div>
                <div>✓ All 5 playbooks · 50 snippets</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowUpgrade(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Maybe later
              </button>
              <Link href="/settings/billing" onClick={() => setShowUpgrade(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>
                View plans
              </Link>
            </div>

            <div className="text-center mt-3">
              <p className="text-[10px] text-gray-400">Have an access code? Enter it in Settings → Billing</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return { check, limits, showUpgrade, UpgradeModal, refresh: loadLimits }
}
